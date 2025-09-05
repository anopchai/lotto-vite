# Lotto Vite System Deployment Guide

## Prerequisites

1. Docker and Docker Compose installed
2. Node.js 18+ installed
3. MySQL 8.0+ installed and running
4. ngrok account (for public access)

## Initial Setup

### 1. Database Setup

Make sure your MySQL server is running and create the database:

```sql
CREATE DATABASE lotto_vite_system;
```

Import the schema:

```bash
mysql -u root -p lotto_vite_system < database/schema.sql
```

### 2. Environment Configuration

Update the backend environment variables in `backend/.env`:

```
DB_HOST=host.docker.internal
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lotto_vite_system
DB_PORT=3306
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

## Docker Deployment

### 1. Build and Run Services

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### 2. Access the Application

- **Local Access**: http://localhost
- **Ngrok Public Access**: Check http://localhost:4040 for the public URL

### 3. Stop Services

```bash
docker-compose down
```

## Ngrok Setup

### 1. Using the Setup Script (Windows)

```bash
setup-ngrok.bat
```

### 2. Manual Setup

```bash
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
```

Replace `YOUR_NGROK_AUTHTOKEN` with your actual ngrok authtoken.

## Service Details

### Backend (Node.js + Express)
- Port: 3001
- Health Check: http://localhost:3001/api/health

### Frontend (React + Vite)
- Served through Nginx
- Port: 80

### Nginx Reverse Proxy
- Main entry point for both frontend and backend
- Handles API routing (/api/*) to backend

### Ngrok
- Provides public access to the application
- Web interface: http://localhost:4040

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MySQL is running
   - Verify database credentials in `backend/.env`
   - Ensure the database `lotto_vite_system` exists

2. **Services Not Starting**
   - Check Docker logs: `docker-compose logs`
   - Verify Docker has sufficient resources

3. **Ngrok Not Working**
   - Ensure ngrok is installed and in PATH
   - Check authtoken is correctly configured
   - Verify port 4040 is not blocked

### Checking Logs

```bash
# Check all service logs
docker-compose logs

# Check specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
docker-compose logs ngrok
```

## Production Considerations

1. **Security**
   - Change the default JWT secret
   - Use strong database passwords
   - Configure proper CORS settings

2. **Performance**
   - Use a production-grade database
   - Configure appropriate resource limits in Docker
   - Set up monitoring and alerting

3. **Backup**
   - Regular database backups
   - Backup important configuration files