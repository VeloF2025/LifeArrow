# LifePath Wellness Management System

A comprehensive wellness management application built with React, TypeScript, and Supabase. This system provides complete client onboarding, profile management, scan data processing, and form building capabilities.

## 🌟 Features

### 🔐 **Authentication & Role Management**
- Multi-role authentication (Admin, Staff, Client)
- Secure user registration and login
- Role-based access control

### 👥 **Client Management**
- Comprehensive client onboarding wizard
- Dynamic form builder for custom onboarding
- Profile management with step-by-step editing
- Client search and management tools

### 📊 **Scan Data Management**
- Automated scan file processing (Excel, CSV, PDF, Images)
- Path ID extraction and client assignment
- Dropbox integration for automated uploads
- Scan comparison and trend analysis

### 📝 **Form Builder System**
- Drag-and-drop form builder
- Multiple field types (text, select, checkbox, file upload, etc.)
- Form templates and reusable components
- Import forms from various file formats

### 🎨 **Beautiful UI/UX**
- Modern, responsive design with Tailwind CSS
- Luxury pastel wellness color palette
- Smooth animations and micro-interactions
- Mobile-first responsive design

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom wellness design system
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **File Processing**: XLSX, PDF.js, Mammoth
- **Deployment**: Netlify ready

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lifepath-wellness.git
   cd lifepath-wellness
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the migration files in `supabase/migrations/` in order
   - Enable Row Level Security (RLS) on all tables

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema with the following main tables:

- **profiles** - User profile information
- **clients** - Client-specific data and codes
- **client_onboarding_data** - Comprehensive onboarding information
- **form_templates** - Dynamic form templates
- **scans** - Scan data and processing results
- **bookings** - Appointment scheduling
- **payments** - Payment processing
- **system_settings** - Application configuration

## 🔧 Configuration

### Form Templates
- Create custom onboarding forms in Settings > Form Templates
- Set default onboarding form in system settings
- Import forms from Excel, CSV, PDF, or Word documents

### User Roles
- **Admin**: Full system access, user management, settings
- **Staff**: Client management, scan processing, reports
- **Client**: Personal profile, wellness tracking, appointments

### Scan Processing
- Automatic client ID extraction from cell A3
- Support for multiple file formats
- Dropbox integration for automated processing
- Quality scoring and validation

## 🚀 Deployment

### Netlify Deployment
```bash
npm run build
# Deploy the dist/ folder to Netlify
```

### Environment Variables for Production
```env
VITE_SUPABASE_URL=your-production-supabase-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_DEFAULT_CURRENCY=ZAR
VITE_TIMEZONE=Africa/Johannesburg
VITE_VAT_RATE=0.15
```

## 📱 Demo Accounts

For testing purposes, you can use these demo accounts:

- **Admin**: admin@lifepath.com / admin123
- **Staff**: staff@lifepath.com / staff123  
- **Client**: client@lifepath.com / client123

## 🛠️ Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── admin/          # Admin-specific components
│   ├── client/         # Client-specific components
│   ├── forms/          # Form builder and renderer
│   ├── scans/          # Scan management components
│   ├── ui/             # Base UI components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── pages/              # Page components
└── types/              # TypeScript type definitions
```

### Key Features Implementation

#### Form Builder
- Drag-and-drop interface with react-beautiful-dnd
- Dynamic field types with validation
- Real-time preview and editing
- Export/import functionality

#### Scan Processing
- Multi-format file support
- Automated client matching
- Quality scoring algorithm
- Batch processing capabilities

#### Profile Management
- Step-by-step editing wizard
- Auto-save functionality
- Progress tracking
- Comprehensive data validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@lifepathwellness.co.za or create an issue in this repository.

## 🙏 Acknowledgments

- Built with modern React and TypeScript best practices
- Designed with accessibility and user experience in mind
- Optimized for South African wellness industry requirements
- Inspired by leading wellness and healthcare platforms