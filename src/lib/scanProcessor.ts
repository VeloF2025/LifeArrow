import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import { supabase } from './supabase'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export interface ProcessingResult {
  success: boolean
  data?: {
    client_id?: string
    client_info?: {
      client_code: string
      first_name: string
      last_name: string
      email: string
    }
    path_ids: Array<{
      path_id: string
      value: string | number
      description?: string
      unit?: string
      reference_range?: string
      status?: 'normal' | 'high' | 'low' | 'critical'
    }>
    automation_status: 'automated' | 'manual' | 'failed'
    quality_score: number
    warnings: string[]
    raw_structure?: any
  }
  error?: string
}

export class ScanProcessor {
  static async processFile(file: File): Promise<ProcessingResult> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      
      switch (fileExtension) {
        case 'xlsx':
        case 'xls':
          return await this.processExcel(file)
        case 'csv':
          return await this.processCSV(file)
        case 'pdf':
          return await this.processPDF(file)
        case 'txt':
          return await this.processText(file)
        case 'json':
          return await this.processJSON(file)
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'tiff':
          return await this.processImage(file)
        default:
          return {
            success: false,
            error: `Unsupported file format: ${fileExtension}`
          }
      }
    } catch (error) {
      console.error('File processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      }
    }
  }

  private static async processExcel(file: File): Promise<ProcessingResult> {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Use the first worksheet
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    // Convert to array of arrays
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][]
    
    if (data.length < 3) {
      return {
        success: false,
        error: 'Excel file must have at least 3 rows (Path IDs, Information, Identifying Fields)'
      }
    }

    return this.parseStandardFormat(data, file.name)
  }

  private static async processCSV(file: File): Promise<ProcessingResult> {
    const text = await file.text()
    const lines = text.split('\n').map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')))
    
    if (lines.length < 3) {
      return {
        success: false,
        error: 'CSV file must have at least 3 rows (Path IDs, Information, Identifying Fields)'
      }
    }

    return this.parseStandardFormat(lines, file.name)
  }

  private static async processPDF(file: File): Promise<ProcessingResult> {
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

      // Try to parse as structured data
      return this.parseUnstructuredText(fullText, file.name)
    } catch (error) {
      return {
        success: false,
        error: `PDF processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private static async processText(file: File): Promise<ProcessingResult> {
    const text = await file.text()
    
    if (!text.trim()) {
      return {
        success: false,
        error: 'Text file appears to be empty'
      }
    }

    return this.parseUnstructuredText(text, file.name)
  }

  private static async processJSON(file: File): Promise<ProcessingResult> {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Try to parse as structured scan data
      if (Array.isArray(data) && data.length >= 3) {
        return this.parseStandardFormat(data, file.name)
      }
      
      // Try to extract path IDs from object structure
      return this.parseJSONStructure(data, file.name)
    } catch (error) {
      return {
        success: false,
        error: `JSON parsing error: ${error instanceof Error ? error.message : 'Invalid JSON format'}`
      }
    }
  }

  private static async processImage(file: File): Promise<ProcessingResult> {
    // For now, return a placeholder result
    // In a real implementation, you would use OCR to extract text from images
    return {
      success: false,
      error: 'Image processing with OCR is not yet implemented. Please convert to text format.'
    }
  }

  private static async parseStandardFormat(data: any[][], fileName: string): Promise<ProcessingResult> {
    const warnings: string[] = []
    
    // Row 1: Path ID numbers
    const pathIDRow = data[0] || []
    const pathIDs = pathIDRow.filter(id => id && id.toString().trim())
    
    if (pathIDs.length === 0) {
      return {
        success: false,
        error: 'No Path IDs found in row 1'
      }
    }

    // Row 2: Path ID information/descriptions
    const infoRow = data[1] || []
    
    // Row 3: Identifying fields (A3 should contain Client ID)
    const identifyingRow = data[2] || []
    const clientID = identifyingRow[0]?.toString().trim() // A3 cell
    
    // Build Path ID data
    const pathIDData = pathIDs.map((pathID, index) => ({
      path_id: pathID.toString(),
      value: infoRow[index] || '',
      description: `Path ID ${pathID}`,
      unit: this.extractUnit(infoRow[index]?.toString() || ''),
      status: this.determineStatus(infoRow[index])
    }))

    // Try to find client by ID
    let clientInfo = null
    let automationStatus: 'automated' | 'manual' | 'failed' = 'failed'
    
    if (clientID) {
      try {
        const { data: clientData, error } = await supabase
          .from('clients')
          .select(`
            id,
            client_code,
            profile:profiles!clients_profile_id_fkey(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .or('client_code', 'eq', clientID)
          .or('profile.email', 'eq', clientID)
          .single()

        if (!error && clientData) {
          clientInfo = {
            client_id: clientData.profile?.id,
            client_code: clientData.client_code,
            first_name: clientData.profile?.first_name || '',
            last_name: clientData.profile?.last_name || '',
            email: clientData.profile?.email || ''
          }
          automationStatus = 'automated'
        }
      } catch (error) {
        console.log('Client lookup failed:', error)
        warnings.push(`Client ID "${clientID}" not found in database`)
      }
    } else {
      warnings.push('No Client ID found in cell A3')
    }

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(pathIDData, clientInfo !== null, data)
    
    if (qualityScore < 70) {
      warnings.push('Low data quality detected - please review extracted information')
    }

    return {
      success: true,
      data: {
        client_id: clientInfo?.client_id,
        client_info: clientInfo ? {
          client_code: clientInfo.client_code,
          first_name: clientInfo.first_name,
          last_name: clientInfo.last_name,
          email: clientInfo.email
        } : undefined,
        path_ids: pathIDData,
        automation_status: automationStatus,
        quality_score: qualityScore,
        warnings,
        raw_structure: {
          path_ids_row: pathIDRow,
          info_row: infoRow,
          identifying_row: identifyingRow,
          total_rows: data.length,
          total_columns: Math.max(...data.map(row => row.length))
        }
      }
    }
  }

  private static async parseUnstructuredText(text: string, fileName: string): Promise<ProcessingResult> {
    const warnings: string[] = []
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    
    // Try to extract client ID from various patterns
    let clientID = null
    const clientIDPatterns = [
      /client\s*id\s*:?\s*([A-Za-z0-9]+)/i,
      /patient\s*id\s*:?\s*([A-Za-z0-9]+)/i,
      /id\s*:?\s*([A-Za-z0-9]+)/i,
      /code\s*:?\s*([A-Za-z0-9]+)/i
    ]
    
    for (const pattern of clientIDPatterns) {
      for (const line of lines) {
        const match = line.match(pattern)
        if (match) {
          clientID = match[1]
          break
        }
      }
      if (clientID) break
    }

    // Extract path ID-like data
    const pathIDData = []
    const pathIDPattern = /([A-Za-z0-9_-]+)\s*:?\s*([0-9.,]+)\s*([A-Za-z/%]*)/
    
    for (const line of lines) {
      const match = line.match(pathIDPattern)
      if (match) {
        pathIDData.push({
          path_id: match[1],
          value: match[2],
          description: `Extracted from: ${line}`,
          unit: match[3] || '',
          status: this.determineStatus(match[2])
        })
      }
    }

    if (pathIDData.length === 0) {
      return {
        success: false,
        error: 'No structured data could be extracted from the text'
      }
    }

    // Try to find client
    let clientInfo = null
    let automationStatus: 'automated' | 'manual' | 'failed' = 'failed'
    
    if (clientID) {
      try {
        const { data: clientData, error } = await supabase
          .from('clients')
          .select(`
            id,
            client_code,
            profile:profiles!clients_profile_id_fkey(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .or('client_code', 'eq', clientID)
          .or('profile.email', 'eq', clientID)
          .single()

        if (!error && clientData) {
          clientInfo = {
            client_id: clientData.profile?.id,
            client_code: clientData.client_code,
            first_name: clientData.profile?.first_name || '',
            last_name: clientData.profile?.last_name || '',
            email: clientData.profile?.email || ''
          }
          automationStatus = 'automated'
        }
      } catch (error) {
        warnings.push(`Client ID "${clientID}" not found in database`)
      }
    } else {
      warnings.push('No Client ID could be extracted from text')
    }

    const qualityScore = this.calculateQualityScore(pathIDData, clientInfo !== null, [])
    warnings.push('Text parsing used - please verify extracted data accuracy')

    return {
      success: true,
      data: {
        client_id: clientInfo?.client_id,
        client_info: clientInfo ? {
          client_code: clientInfo.client_code,
          first_name: clientInfo.first_name,
          last_name: clientInfo.last_name,
          email: clientInfo.email
        } : undefined,
        path_ids: pathIDData,
        automation_status: automationStatus,
        quality_score: qualityScore,
        warnings
      }
    }
  }

  private static async parseJSONStructure(data: any, fileName: string): Promise<ProcessingResult> {
    const warnings: string[] = []
    const pathIDData = []
    
    // Try to extract path IDs from object structure
    const extractPathIDs = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          extractPathIDs(value, fullKey)
        } else if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
          pathIDData.push({
            path_id: fullKey,
            value: value,
            description: `JSON field: ${fullKey}`,
            unit: '',
            status: this.determineStatus(value)
          })
        }
      }
    }

    extractPathIDs(data)

    if (pathIDData.length === 0) {
      return {
        success: false,
        error: 'No numeric data could be extracted from JSON structure'
      }
    }

    // Try to find client ID in the JSON
    let clientID = null
    const findClientID = (obj: any): string | null => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && (
          key.toLowerCase().includes('client') ||
          key.toLowerCase().includes('patient') ||
          key.toLowerCase().includes('id')
        )) {
          return value
        }
        if (typeof value === 'object' && value !== null) {
          const found = findClientID(value)
          if (found) return found
        }
      }
      return null
    }

    clientID = findClientID(data)

    let clientInfo = null
    let automationStatus: 'automated' | 'manual' | 'failed' = 'failed'
    
    if (clientID) {
      try {
        const { data: clientData, error } = await supabase
          .from('clients')
          .select(`
            id,
            client_code,
            profile:profiles!clients_profile_id_fkey(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .or('client_code', 'eq', clientID)
          .or('profile.email', 'eq', clientID)
          .single()

        if (!error && clientData) {
          clientInfo = {
            client_id: clientData.profile?.id,
            client_code: clientData.client_code,
            first_name: clientData.profile?.first_name || '',
            last_name: clientData.profile?.last_name || '',
            email: clientData.profile?.email || ''
          }
          automationStatus = 'automated'
        }
      } catch (error) {
        warnings.push(`Client ID "${clientID}" not found in database`)
      }
    } else {
      warnings.push('No Client ID could be extracted from JSON')
    }

    const qualityScore = this.calculateQualityScore(pathIDData, clientInfo !== null, [])
    warnings.push('JSON structure parsing used - please verify field mappings')

    return {
      success: true,
      data: {
        client_id: clientInfo?.client_id,
        client_info: clientInfo ? {
          client_code: clientInfo.client_code,
          first_name: clientInfo.first_name,
          last_name: clientInfo.last_name,
          email: clientInfo.email
        } : undefined,
        path_ids: pathIDData,
        automation_status: automationStatus,
        quality_score: qualityScore,
        warnings
      }
    }
  }

  private static extractUnit(value: string): string {
    const unitPatterns = [
      /([a-zA-Z/%]+)$/,  // Units at the end
      /\(([^)]+)\)/,     // Units in parentheses
    ]
    
    for (const pattern of unitPatterns) {
      const match = value.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    return ''
  }

  private static determineStatus(value: any): 'normal' | 'high' | 'low' | 'critical' {
    // Simple heuristic - in a real implementation, you'd have reference ranges
    const numValue = typeof value === 'number' ? value : parseFloat(value?.toString() || '0')
    
    if (isNaN(numValue)) return 'normal'
    
    // Very basic status determination - would need proper reference ranges
    if (numValue > 1000 || numValue < 0) return 'critical'
    if (numValue > 100) return 'high'
    if (numValue < 10) return 'low'
    
    return 'normal'
  }

  private static calculateQualityScore(
    pathIDData: any[], 
    hasClientInfo: boolean, 
    rawData: any[][]
  ): number {
    let score = 0
    
    // Base score for having data
    if (pathIDData.length > 0) score += 30
    
    // Client information found
    if (hasClientInfo) score += 30
    
    // Data completeness
    const completenessRatio = pathIDData.filter(p => p.value && p.value.toString().trim()).length / Math.max(pathIDData.length, 1)
    score += completenessRatio * 20
    
    // Structure quality (for structured formats)
    if (rawData.length >= 3) score += 10
    
    // Path ID quality
    const validPathIDs = pathIDData.filter(p => p.path_id && p.path_id.toString().trim()).length
    score += (validPathIDs / Math.max(pathIDData.length, 1)) * 10
    
    return Math.min(100, Math.max(0, score))
  }
}