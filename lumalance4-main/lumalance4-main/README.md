# LumaLance - Next-Generation Freelance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-blue.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)

**The GitHub + Figma + Upwork of freelancing** - A comprehensive platform that becomes the actual workspace where freelancers and clients collaborate, featuring innovative dual payment systems and AI-powered assistance.

> **🎯 Status**: MVP Complete & Production Ready | **📊 Progress**: 90% Complete

## � Documentation Hub

**👉 [Complete Documentation](./docs/README.md)** - Comprehensive guides, tutorials, and references

### Quick Links
- **🚀 [Quick Setup Guide](./docs/01-getting-started/quick-setup.md)** - Get running in 5 minutes
- **🏗️ [Project Overview](./docs/01-getting-started/project-overview.md)** - What is LumaLance?
- **🔧 [Installation Guide](./docs/01-getting-started/installation.md)** - Detailed setup instructions
- **📋 [Current TODO List](./docs/05-project-management/current-todo.md)** - Active development tasks
- **🎯 [Technical Review](./docs/06-advanced/technical-review.md)** - Architecture improvements
- **🚀 [Senior Insights](./docs/06-advanced/senior-insights.md)** - Advanced features & strategy

## �🚀 Features

### ✅ Core Platform Features
- **User Authentication** - Email/password + Telegram OAuth integration
- **Project Management** - Complete CRUD with categories, skills, and status tracking
- **Proposal System** - Freelancer proposals with status management
- **Messaging System** - Real-time communication between clients and freelancers
- **Milestone Management** - Project milestones with role-based permissions
- **Notification System** - In-app notifications with Telegram integration

### 💰 Payment & Rewards Systems
- **Payment Tracking** - Traditional milestone-based payment management
- **Fiat Rewards** - Real money rewards for achievements (15+ categories)
- **Points System** - Crypto-like LumaLance Points with transfers and gamification
- **Payment Methods** - User payment method management
- **Transaction History** - Comprehensive payment and reward tracking

### 📊 Analytics & Insights
- **Admin Analytics** - Platform-wide statistics and performance metrics
- **Freelancer Analytics** - Individual earnings projections and performance tracking
- **Real-time Data** - Live statistics and trend analysis
- **Performance Metrics** - Success rates, completion times, and client satisfaction

### 🤖 Telegram Integration
- **Telegram OAuth** - Secure authentication via Telegram
- **Bot Commands** - Project management through Telegram bot
- **Notifications** - Real-time updates via Telegram
- **Account Linking** - Seamless integration between web and Telegram

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18 with TypeScript
- **Styling**: TailwindCSS with custom design tokens
- **Icons**: Lucide React
- **State Management**: React Context API + Server Components

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 15 with comprehensive schema
- **Authentication**: JWT with refresh tokens
- **File Upload**: Multer for avatar and file handling
- **Validation**: Input sanitization and validation

### DevOps & Tools
- **Package Manager**: npm
- **Version Control**: Git
- **Database Migrations**: Custom migration system
- **Environment**: Docker-ready configuration

## 📁 Project Structure

```
lumalance4/
├── app/                    # Next.js app directory (frontend)
│   ├── dashboard/         # Dashboard pages
│   ├── projects/          # Project pages
│   ├── auth/              # Authentication pages
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── projects/          # Project-related components
│   ├── milestones/        # Milestone components
│   └── llm-assistant/     # AI assistant components
├── lib/                   # Shared utilities
│   ├── api/              # API client and endpoints
│   ├── auth/             # Authentication utilities
│   └── design-tokens.ts  # Design system
├── server/               # Express.js backend
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── database/         # Database connection
│   ├── telegram/         # Telegram bot integration
│   └── middleware/       # Express middleware
├── migrations/           # Database migrations
├── docs/                 # Comprehensive documentation
└── public/              # Static assets
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lumalance4
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up PostgreSQL**
   ```bash
   # Follow the PostgreSQL setup guide in docs/postgresql_setup.md
   ```

5. **Run database migrations**
   ```bash
   npm run migrate:up
   ```

6. **Start the development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📚 Documentation

**📖 [Complete Documentation Hub](./docs/README.md)** - All documentation organized by topic

### Quick Access
- **🚀 Getting Started**: [Setup](./docs/01-getting-started/) | [Overview](./docs/01-getting-started/project-overview.md)
- **🏗️ Architecture**: [System Design](./docs/02-architecture/) | [Database](./docs/02-architecture/database-schema.md)
- **💡 Features**: [Payment System](./docs/03-features/payment-rewards.md) | [Analytics](./docs/03-features/analytics.md)
- **🛠️ Development**: [Workflow](./docs/04-development/) | [Frontend](./docs/04-development/)
- **📋 Project Management**: [TODO Lists](./docs/05-project-management/) | [Roadmap](./docs/05-project-management/current-todo.md)
- **🔬 Advanced**: [Technical Review](./docs/06-advanced/technical-review.md) | [Future Features](./docs/06-advanced/senior-insights.md)

## 🎯 Key Features in Detail

### Dual Payment System
LumaLance features a unique dual payment approach:

**Fiat Rewards System**
- 15 built-in achievement categories
- Real money rewards for milestones and achievements
- Automatic reward distribution
- Payment status tracking (pending/paid)
- Transaction history with unique IDs

**Points System**
- Crypto-like LumaLance Points (LP)
- Points minting for milestone completion
- Peer-to-peer point transfers
- Achievement system with badges
- Transaction history with hashes

### Comprehensive Analytics
**Admin Analytics**
- Platform statistics and user growth
- Financial metrics and revenue tracking
- Category and skill analysis
- Monthly trends and performance insights

**Freelancer Analytics**
- Earnings projections and estimates
- Performance metrics and success rates
- Payment tracking and upcoming payments
- Skill utilization and client satisfaction

### Achievement System
15 achievement categories including:
- **First Milestone** ($5.00) - Complete your first milestone
- **Milestone Master** ($25.00) - Complete 10 milestones
- **Project Champion** ($100.00) - Complete 50 milestones
- **Earning Legend** ($50.00) - Earn $1000 through milestones
- **Quality Master** ($40.00) - Receive 10 positive reviews
- And 10 more categories with varying rewards

### Real-time Features
- Live messaging between users
- Real-time notification delivery
- Live analytics updates
- Instant payment status changes

## 🔧 API Endpoints

### Core APIs
- `GET/POST /api/auth/*` - Authentication endpoints
- `GET/POST/PUT/DELETE /api/users/*` - User management
- `GET/POST/PUT/DELETE /api/projects/*` - Project CRUD
- `GET/POST/PUT/DELETE /api/proposals/*` - Proposal management
- `GET/POST/PUT/DELETE /api/milestones/*` - Milestone management

### Payment & Rewards APIs
- `GET/POST /api/payments/*` - Payment tracking
- `GET/POST /api/fiat-rewards/*` - Fiat rewards system
- `GET/POST /api/points/*` - Points system
- `GET/POST /api/notifications/*` - Notification management

### Analytics APIs
- `GET /api/analytics/admin/overview` - Admin platform statistics
- `GET /api/analytics/freelancer/earnings` - Freelancer earnings analysis
- `GET /api/analytics/freelancer/performance` - Performance metrics

## 🎨 User Interface

### Dashboard Features
- **Overview**: Key metrics and quick actions
- **Projects**: Project management and tracking
- **Proposals**: Proposal submission and status
- **Messages**: Real-time messaging interface
- **Payments**: Payment tracking and methods
- **Earnings**: Earnings analytics and projections
- **Points**: Points balance and transfers
- **Rewards**: Fiat rewards and achievements
- **Notifications**: In-app notification center

### Admin Dashboard
- **Platform Overview**: User growth, project activity, financial metrics
- **Trends**: Monthly trends and growth analysis
- **Categories**: Top categories and engagement rates
- **Skills**: Most in-demand skills and demand levels

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Password Hashing** with bcrypt
- **Input Validation** and sanitization
- **Role-based Access Control**
- **SQL Injection Prevention**
- **XSS Protection**
- **CSRF Protection**

## 📊 Performance Optimization

- **Database Indexing** for optimal query performance
- **Caching Strategies** for frequently accessed data
- **Lazy Loading** for on-demand data loading
- **Image Optimization** for avatars and uploads
- **Code Splitting** for better load times

## 🚀 Deployment

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lumalance

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your-bot-username

# Server
PORT=5000
NODE_ENV=production

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

## 🔧 Troubleshooting

### Telegram Bot Conflicts
If you encounter Telegram bot errors like `409: Conflict: terminated by other getUpdates request`, this usually indicates multiple bot instances are running simultaneously.

**Common Causes:**
- Old PM2 processes from previous installations
- Multiple users running the same bot token
- Conflicting processes from `/var/www/lumalanc3` or similar directories

**Resolution Steps:**
1. **Check for conflicting processes:**
   ```bash
   ps aux | grep -i telegram
   ps aux | grep lumalanc3
   ```

2. **Check PM2 processes for all users:**
   ```bash
   pm2 list
   sudo -u tonidroni pm2 list  # Check other user's PM2 processes
   ```

3. **Stop and delete conflicting processes:**
   ```bash
   sudo -u tonidroni pm2 stop lumalance
   sudo -u tonidroni pm2 delete lumalance
   sudo -u tonidroni pm2 save
   ```

4. **Restart your application:**
   ```bash
   pm2 restart lumalance-app
   ```

### Port Conflicts
If you encounter `EADDRINUSE` errors, check for processes using the same ports:

```bash
# Check what's using port 4420 (backend)
sudo lsof -i :4420

# Check what's using port 3000 (frontend)
sudo lsof -i :3000

# Kill conflicting processes
sudo kill -9 <PID>
```

### Express Rate Limiting Warning
If you see warnings about `X-Forwarded-For` headers, this is a minor configuration issue that doesn't affect functionality. The warning occurs when using nginx as a reverse proxy without proper Express trust proxy settings.

### Fail2ban Connection Issues
If you encounter `ERR_CONNECTION_TIMED_OUT` errors, this is likely due to fail2ban blocking your IP address. This commonly happens during development when repeated requests trigger security rules.

**Quick Fix:**
```bash
# Unban all IPs and apply development configuration
sudo fail2ban-client unban --all
sudo cp fail2ban-development.conf /etc/fail2ban/jail.local
sudo systemctl restart fail2ban
```

**For detailed troubleshooting, see:** [Fail2ban Troubleshooting Guide](docs/fail2ban-troubleshooting.md)

### Production Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build the application
5. Start the production server

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Use conventional commit messages
- Follow the established code style
- Write tests for new features
- Document your changes
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](docs/)
- Review the [issues](https://github.com/your-repo/lumalance4/issues)
- Create a new issue for bugs or feature requests

## 🎉 Acknowledgments

- Next.js team for the amazing framework
- TailwindCSS for the utility-first CSS framework
- PostgreSQL community for the robust database
- All contributors who have helped build LumaLance

---

**LumaLance** - Empowering freelancers and clients with innovative collaboration tools and reward systems.
