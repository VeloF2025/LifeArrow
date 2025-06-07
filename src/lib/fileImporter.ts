import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import { parse as csvParse } from 'csv-parse/browser/esm'
import { FormField, FormTemplate, FieldType } from '../components/forms/FormBuilder'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export interface ImportResult {
  success: boolean
  template?: FormTemplate
  error?: string
  warnings?: string[]
}

export interface ParsedField {
  label: string
  type: FieldType
  required: boolean
  options?: string[]
  placeholder?: string
  description?: string
}

// Common field type patterns for intelligent detection
const FIELD_TYPE_PATTERNS = {
  email: /email|e-mail|electronic.?mail/i,
  phone: /phone|mobile|cell|telephone|contact.?number/i,
  date: /date|birth|dob|birthday|when|time/i,
  number: /number|age|quantity|amount|count|score|rating/i,
  textarea: /address|description|comment|note|message|feedback|bio|about/i,
  url: /website|url|link|homepage/i,
  checkbox: /agree|accept|consent|confirm|yes.?no|true.?false/i,
  select: /select|choose|pick|option|dropdown/i,
  radio: /radio|choice|option/i,
}

const REQUIRED_PATTERNS = /required|mandatory|\*|must|need/i

export class FileImporter {
  static async importFile(file: File): Promise<ImportResult> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      
      switch (fileExtension) {
        case 'xlsx':
        case 'xls':
          return await this.importExcel(file)
        case 'csv':
          return await this.importCSV(file)
        case 'pdf':
          return await this.importPDF(file)
        case 'docx':
          return await this.importWord(file)
        case 'txt':
          return await this.importText(file)
        case 'json':
          return await this.importJSON(file)
        default:
          return {
            success: false,
            error: `Unsupported file format: ${fileExtension}. Supported formats: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), Word (.docx), Text (.txt), JSON (.json)`
          }
      }
    } catch (error) {
      console.error('File import error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during import'
      }
    }
  }

  private static async importExcel(file: File): Promise<ImportResult> {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Use the first worksheet
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
    
    if (data.length === 0) {
      return {
        success: false,
        error: 'Excel file appears to be empty'
      }
    }

    const fields = this.parseRowsToFields(data)
    const warnings: string[] = []

    if (fields.length === 0) {
      return {
        success: false,
        error: 'No valid form fields could be extracted from the Excel file'
      }
    }

    if (fields.length > 50) {
      warnings.push(`Large number of fields detected (${fields.length}). Consider breaking into multiple forms.`)
    }

    const template = this.createTemplateFromFields(fields, file.name)
    
    return {
      success: true,
      template,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  private static async importCSV(file: File): Promise<ImportResult> {
    const text = await file.text()
    
    return new Promise((resolve) => {
      csvParse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) {
          resolve({
            success: false,
            error: `CSV parsing error: ${err.message}`
          })
          return
        }

        if (!records || records.length === 0) {
          resolve({
            success: false,
            error: 'CSV file appears to be empty or has no valid data'
          })
          return
        }

        // Extract field names from the first record
        const fieldNames = Object.keys(records[0])
        const fields = fieldNames.map(name => this.parseFieldFromName(name))
        
        const template = this.createTemplateFromFields(fields, file.name)
        
        resolve({
          success: true,
          template
        })
      })
    })
  }

  private static async importPDF(file: File): Promise<ImportResult> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      let fullText = ''
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n'
      }

      if (!fullText.trim()) {
        return {
          success: false,
          error: 'No text could be extracted from the PDF file'
        }
      }

      const fields = this.parseTextToFields(fullText)
      
      if (fields.length === 0) {
        return {
          success: false,
          error: 'No form fields could be identified in the PDF content'
        }
      }

      const template = this.createTemplateFromFields(fields, file.name)
      
      return {
        success: true,
        template,
        warnings: ['PDF import uses text analysis. Please review and adjust field types as needed.']
      }
    } catch (error) {
      return {
        success: false,
        error: `PDF processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private static async importWord(file: File): Promise<ImportResult> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      
      if (!result.value.trim()) {
        return {
          success: false,
          error: 'No text could be extracted from the Word document'
        }
      }

      const fields = this.parseTextToFields(result.value)
      
      if (fields.length === 0) {
        return {
          success: false,
          error: 'No form fields could be identified in the document content'
        }
      }

      const template = this.createTemplateFromFields(fields, file.name)
      
      const warnings = []
      if (result.messages.length > 0) {
        warnings.push('Some document formatting may not have been preserved during import.')
      }
      
      return {
        success: true,
        template,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      return {
        success: false,
        error: `Word document processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private static async importText(file: File): Promise<ImportResult> {
    const text = await file.text()
    
    if (!text.trim()) {
      return {
        success: false,
        error: 'Text file appears to be empty'
      }
    }

    const fields = this.parseTextToFields(text)
    
    if (fields.length === 0) {
      return {
        success: false,
        error: 'No form fields could be identified in the text content'
      }
    }

    const template = this.createTemplateFromFields(fields, file.name)
    
    return {
      success: true,
      template,
      warnings: ['Text import uses pattern analysis. Please review and adjust field types as needed.']
    }
  }

  private static async importJSON(file: File): Promise<ImportResult> {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Check if it's already a FormTemplate
      if (data.name && data.fields && Array.isArray(data.fields)) {
        // Validate the template structure
        const template = data as FormTemplate
        
        // Ensure all required properties exist
        const validatedTemplate: FormTemplate = {
          id: template.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: template.name,
          description: template.description || '',
          fields: template.fields.map(field => ({
            ...field,
            id: field.id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            layout: field.layout || { width: 'full', order: 0 }
          })),
          settings: template.settings || {
            multiPage: false,
            progressBar: true,
            saveProgress: true,
            theme: 'default'
          },
          created_at: template.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: template.created_by || 'imported'
        }
        
        return {
          success: true,
          template: validatedTemplate
        }
      }
      
      // Try to parse as a generic object and extract fields
      const fields = this.parseObjectToFields(data)
      
      if (fields.length === 0) {
        return {
          success: false,
          error: 'No form fields could be extracted from the JSON structure'
        }
      }

      const template = this.createTemplateFromFields(fields, file.name)
      
      return {
        success: true,
        template,
        warnings: ['JSON structure converted to form fields. Please review field types.']
      }
    } catch (error) {
      return {
        success: false,
        error: `JSON parsing error: ${error instanceof Error ? error.message : 'Invalid JSON format'}`
      }
    }
  }

  private static parseRowsToFields(rows: string[][]): ParsedField[] {
    const fields: ParsedField[] = []
    
    // Assume first row contains headers/field names
    const headers = rows[0]
    
    if (!headers || headers.length === 0) {
      return fields
    }

    // Look for additional information in subsequent rows
    const sampleData = rows.slice(1, 6) // Use up to 5 sample rows
    
    headers.forEach((header, index) => {
      if (!header || header.trim() === '') return
      
      const field = this.parseFieldFromName(header)
      
      // Analyze sample data to refine field type
      const columnData = sampleData.map(row => row[index]).filter(Boolean)
      if (columnData.length > 0) {
        const refinedType = this.refineFieldType(field.type, columnData)
        field.type = refinedType
        
        // Extract options for select fields
        if (refinedType === 'select' || refinedType === 'radio') {
          const uniqueValues = [...new Set(columnData)].filter(val => val && val.trim())
          if (uniqueValues.length <= 10 && uniqueValues.length > 1) {
            field.options = uniqueValues
          }
        }
      }
      
      fields.push(field)
    })
    
    return fields
  }

  private static parseTextToFields(text: string): ParsedField[] {
    const fields: ParsedField[] = []
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    
    for (const line of lines) {
      // Look for patterns that suggest form fields
      const fieldPatterns = [
        /^(.+?):\s*$/,  // "Field Name:"
        /^(.+?)\s*\?\s*$/,  // "Field Name?"
        /^(.+?)\s*_+\s*$/,  // "Field Name ____"
        /^(.+?)\s*\[\s*\]\s*$/,  // "Field Name []"
        /^(.+?)\s*\(\s*\)\s*$/,  // "Field Name ()"
        /^\d+\.\s*(.+?)[:?]?\s*$/,  // "1. Field Name:"
        /^[-*]\s*(.+?)[:?]?\s*$/,  // "- Field Name:" or "* Field Name:"
      ]
      
      for (const pattern of fieldPatterns) {
        const match = line.match(pattern)
        if (match) {
          const fieldName = match[1].trim()
          if (fieldName.length > 2 && fieldName.length < 100) {
            const field = this.parseFieldFromName(fieldName)
            fields.push(field)
            break
          }
        }
      }
    }
    
    return fields
  }

  private static parseObjectToFields(obj: any, prefix = ''): ParsedField[] {
    const fields: ParsedField[] = []
    
    if (typeof obj !== 'object' || obj === null) {
      return fields
    }
    
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Nested object - recurse
        fields.push(...this.parseObjectToFields(value, fieldName))
      } else {
        // Create field from key-value pair
        const field = this.parseFieldFromName(fieldName)
        
        // Refine type based on value
        if (Array.isArray(value)) {
          field.type = 'select'
          field.options = value.filter(v => typeof v === 'string')
        } else if (typeof value === 'boolean') {
          field.type = 'checkbox'
        } else if (typeof value === 'number') {
          field.type = 'number'
        }
        
        fields.push(field)
      }
    }
    
    return fields
  }

  private static parseFieldFromName(name: string): ParsedField {
    const cleanName = name.replace(/[_-]/g, ' ').trim()
    const field: ParsedField = {
      label: this.capitalizeWords(cleanName),
      type: 'text',
      required: REQUIRED_PATTERNS.test(name)
    }
    
    // Detect field type based on name patterns
    for (const [type, pattern] of Object.entries(FIELD_TYPE_PATTERNS)) {
      if (pattern.test(name)) {
        field.type = type as FieldType
        break
      }
    }
    
    // Set appropriate placeholder
    switch (field.type) {
      case 'email':
        field.placeholder = 'Enter your email address'
        break
      case 'phone':
        field.placeholder = 'Enter your phone number'
        break
      case 'date':
        field.placeholder = 'Select a date'
        break
      case 'number':
        field.placeholder = 'Enter a number'
        break
      case 'url':
        field.placeholder = 'Enter a URL'
        break
      case 'textarea':
        field.placeholder = 'Enter your response'
        break
    }
    
    return field
  }

  private static refineFieldType(currentType: FieldType, sampleData: string[]): FieldType {
    // Analyze sample data to refine field type
    const allNumeric = sampleData.every(val => !isNaN(Number(val)))
    const allDates = sampleData.every(val => !isNaN(Date.parse(val)))
    const allEmails = sampleData.every(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
    const allUrls = sampleData.every(val => /^https?:\/\//.test(val))
    const allBooleans = sampleData.every(val => /^(true|false|yes|no|1|0)$/i.test(val))
    
    if (allEmails) return 'email'
    if (allUrls) return 'url'
    if (allBooleans) return 'checkbox'
    if (allNumeric) return 'number'
    if (allDates) return 'date'
    
    // Check for limited unique values (potential select field)
    const uniqueValues = new Set(sampleData)
    if (uniqueValues.size <= 10 && uniqueValues.size > 1) {
      return 'select'
    }
    
    return currentType
  }

  private static createTemplateFromFields(fields: ParsedField[], fileName: string): FormTemplate {
    const formFields: FormField[] = fields.map((field, index) => ({
      id: `field_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      type: field.type,
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options,
      description: field.description,
      layout: {
        width: 'full',
        order: index
      }
    }))

    const templateName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
    
    return {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${this.capitalizeWords(templateName)} (Imported)`,
      description: `Form imported from ${fileName}`,
      fields: formFields,
      settings: {
        multiPage: false,
        progressBar: true,
        saveProgress: true,
        theme: 'default'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'imported'
    }
  }

  private static capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, char => char.toUpperCase())
  }
}