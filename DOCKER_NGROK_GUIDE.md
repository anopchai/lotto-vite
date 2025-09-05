# Docker + Ngrok Deployment Guide

This guide explains how to deploy the Lotto Vite System using Docker with public access via ngrok.

## Prerequisites

1. Docker and Docker Compose installed
2. MySQL database already set up and running on localhost
3. Database schema imported
4. Ngrok account with authtoken

## Quick Start

1. **Update Database Configuration**
   Update the database password in `docker-compose.yml`:
   ```yaml
   environment:
     DB_PASSWORD: your_actual_mysql_root_password
   ```

2. **Start Services**
   ```bash
   # On Windows
   start-docker.bat
   
   # Or manually
   docker-compose up -d
   ```

3. **Check Service Status**
   ```bash
   docker-compose ps
   ```

4. **Get Public URL**
   - Open http://localhost:4040 in your browser
   - Find the public URL in the "Tunnels" section
   - Or run `check-ngrok-url.bat`

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

## Configuration Files

### docker-compose.yml
Main Docker Compose configuration with:
- Backend service connecting to host MySQL via `host.docker.internal`
- Frontend service
- Nginx reverse proxy
- Ngrok tunnel service

### ngrok/ngrok.yml
Ngrok configuration with your authtoken:
```yaml
version: "2"
authtoken: YOUR_NGROK_AUTHTOKEN
tunnels:
  lotto-app:
    addr: nginx:80
    proto: http
```

## Scripts

- `start-docker.bat` - Start all Docker services
- `stop-docker.bat` - Stop all Docker services
- `check-ngrok-url.bat` - Display the public ngrok URL

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

### Ngrok Not Working
1. Ensure ngrok is properly configured with your authtoken
2. Check that port 4040 is not blocked
3. Verify your ngrok account is active
4. Check the ngrok dashboard at http://localhost:4040

### Database Connection Issues
1. Verify database credentials in `docker-compose.yml`
2. Ensure MySQL is running on localhost
3. Check that the `lotto_vite_system` database exists

## Stopping Services

```bash
# On Windows
stop-docker.bat

# Or manually
docker-compose down
```

## Best Practices

1. **Security**
   - Change the default JWT secret in `docker-compose.yml`
   - Use a dedicated database user instead of root
   - Don't expose database ports publicly

2. **Performance**
   - Monitor resource usage with `docker stats`
   - Adjust Docker resource limits if needed

3. **Maintenance**
   - Regularly check logs for errors
   - Keep Docker images updated
   - Backup database regularly