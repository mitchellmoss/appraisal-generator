# Appraisal Generator

A web application for creating, printing, and saving jewelry or valuable item appraisals. This application allows users to enter client details, add multiple article descriptions, print appraisals, and download them as HTML files with proper formatting. All appraisals are now saved on the server as well.

## Features

- Client information form
- Dynamic addition and removal of article descriptions
- Local storage to save form data between sessions
- Print functionality with proper styling
- Download appraisals as HTML files
- Server-side storage of all appraisals

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
   
For development with auto-restart:
```
npm run dev
```

## Usage

1. Open the application in your browser at http://localhost:3000
2. Fill out the client and appraiser information
3. Add article descriptions as needed
4. Click "Print" to print the appraisal or "Download" to save it as an HTML file
   - When clicking "Download", the appraisal will be saved to the server and downloaded locally

## API Endpoints

The server provides the following API endpoints:

- `POST /api/appraisals` - Save a new appraisal
- `GET /api/appraisals/:id` - Retrieve a specific appraisal
- `GET /api/appraisals` - List all saved appraisals

## File Storage

All appraisals are saved as JSON files in the `appraisals` directory with unique UUIDs as filenames.

## Project Structure

- `index.html` - Main application HTML
- `style.css` - Styling for the application
- `script.js` - Client-side JavaScript for form handling and API integration
- `server.js` - Express server with API endpoints
- `appraisals/` - Directory where appraisal data is stored

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- Express
- UUID for unique identifiers