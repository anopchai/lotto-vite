# Lotto Vite System

An online lottery sales platform built with React 18 + Vite + Tailwind CSS (Frontend) and Node.js + Express + MySQL (Backend).

## Features

- Lottery ticket entry with multiple types (2-digit, 3-digit, 1-digit)
- Automatic number reversal
- Result announcement and winner calculation
- Role-based access control (Admin & Agent)
- Sales and winner reports with daily/monthly statistics
- System settings management (e.g., payout rates, draw periods)
- Responsive UI with dark/light mode support

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- Docker and Docker Compose (for containerized deployment)

## Quick Start (Development)

1. **Database Setup**
   ```sql
   CREATE DATABASE lotto_vite_system;
   ```
   Import the schema:
   ```bash
   mysql -u root -p lotto_vite_system < database/schema.sql
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Update .env with your database credentials
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Docker + Ngrok Deployment

For public access to your local development environment:

1. **Update Database Configuration**
   ```bash
   update-docker-env.bat
   ```

2. **Start Services**
   ```bash
   start-docker.bat
   ```

3. **Access the Application**
   - Local: http://localhost
   - Public: Check http://localhost:4040 for the ngrok URL

See [README_DOCKER_NGROK.md](README_DOCKER_NGROK.md) for detailed instructions.

## Project Structure

```
├── backend/                 # Node.js + Express backend
│   ├── controllers/         # Route handlers
│   ├── middleware/          # Authentication and logging
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── config/              # Database configuration
│   └── ...                  # Other backend files
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # Auth and settings contexts
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client services
│   │   └── utils/           # Helper functions
│   └── ...                  # Other frontend files
├── database/                # Database schema and migrations
├── nginx/                   # Nginx configuration
├── ngrok/                   # Ngrok configuration
└── ...                      # Documentation and setup scripts
```

## Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lotto_vite_system
DB_PORT=3306
JWT_SECRET=your_jwt_secret
PORT=3001
```

### Frontend (.env)
```env
VITE_API_URL=/api
```

## API Endpoints

- Auth: `/api/auth/*`
- Agents: `/api/agents/*`
- Tickets: `/api/tickets/*`
- Results: `/api/results/*`
- Reports: `/api/reports/*`
- Settings: `/api/settings/*`
- Periods: `/api/periods/*`
- Half Price: `/api/half-price/*`

## Development Scripts

### Backend
```bash
npm run dev        # Start development server with nodemon
npm start          # Start production server
npm test           # Run tests
```

### Frontend
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run linter
```

### Both
```bash
npm run dev-all    # Start both frontend and backend in development mode
npm run install-all # Install dependencies for both frontend and backend
```

## Deployment

### Docker + Ngrok
See [README_DOCKER_NGROK.md](README_DOCKER_NGROK.md) for detailed instructions.

### Traditional Deployment
See [SERVER_DEPLOYMENT_GUIDE.md](SERVER_DEPLOYMENT_GUIDE.md) for detailed instructions.

## Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - General deployment guide
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Docker-specific deployment
- [DOCKER_NGROK_GUIDE.md](DOCKER_NGROK_GUIDE.md) - Docker + Ngrok setup
- [LOCALHOST_MYSQL_SETUP.md](LOCALHOST_MYSQL_SETUP.md) - Local MySQL setup
- [SERVER_DEPLOYMENT_GUIDE.md](SERVER_DEPLOYMENT_GUIDE.md) - Server deployment
- [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md) - Troubleshooting guide

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on the GitHub repository or contact the development team.