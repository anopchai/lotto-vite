# Docker Deployment for Lotto Vite System

This guide explains how to deploy the Lotto Vite System using Docker with public access via ngrok.

## Prerequisites

1. Docker and Docker Compose installed
2. Node.js 18+ installed
3. MySQL 8.0+ installed and running
4. ngrok account (for public access)

## Quick Start

1. **Setup Database**
   ```sql
   CREATE DATABASE lotto_vite_system;
   ```
   Import the schema:
   ```bash
   mysql -u root -p lotto_vite_system < database/schema.sql
   ```

2. **Configure Environment**
   Update `backend/.env` with your database credentials:
   ```
   DB_HOST=host.docker.internal
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=lotto_vite_system
   DB_PORT=3306
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

3. **Start Services**
   ```bash
   # On Windows
   start-docker.bat
   
   # Or manually
   docker-compose up -d
   ```

4. **Access Application**
   - Local: http://localhost
   - Public (ngrok): Check http://localhost:4040

## Docker Services Overview

- **backend**: Node.js Express API server (port 3001)
- **frontend**: React application served by Nginx
- **nginx**: Reverse proxy handling routing between frontend and backend
- **ngrok**: Public tunnel for accessing the application

## Configuration Files

- `docker-compose.yml`: Main Docker Compose configuration
- `nginx.conf`: Nginx reverse proxy configuration
- `ngrok/ngrok.yml`: Ngrok tunnel configuration
- `backend/.env`: Backend environment variables

## Scripts

- `start-docker.bat`: Start all Docker services
- `stop-docker.bat`: Stop all Docker services
- `setup-ngrok.bat`: Configure ngrok authentication
- `start-ngrok-docker.bat`: Start services and display ngrok URL

## Ngrok Configuration

The system uses ngrok to provide public access to your local development environment. 

1. Get your ngrok authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
2. Update it in `ngrok/ngrok.yml`:
   ```yaml
   authtoken: YOUR_NGROK_AUTHTOKEN
   ```

## Accessing the Application

### Local Access
- URL: http://localhost
- The Nginx reverse proxy handles routing:
  - `/` → Frontend React app
  - `/api/*` → Backend API

### Public Access via Ngrok
1. Open http://localhost:4040 in your browser
2. Find the public URL in the "Tunnels" section
3. Use this URL to access your application from anywhere

## Troubleshooting

### Services Not Starting
```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend
```

### Database Connection Issues
1. Ensure MySQL is running
2. Verify database credentials in `backend/.env`
3. Check that the `lotto_vite_system` database exists

### Ngrok Not Working
1. Ensure ngrok is properly configured with your authtoken
2. Check that port 4040 is not blocked
3. Verify your ngrok account is active

## Stopping Services

```bash
# On Windows
stop-docker.bat

# Or manually
docker-compose down
```

## Production Considerations

For production deployment, consider:

1. Using a production database instead of local MySQL
2. Configuring HTTPS with Let's Encrypt
3. Setting up proper domain names
4. Implementing monitoring and alerting
5. Regular backups of data and configurations