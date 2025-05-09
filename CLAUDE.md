# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Appraisal Generator web application that allows users to create, print, and download jewelry or valuable item appraisals. The application is built with vanilla HTML, CSS, and JavaScript, requiring no build process or dependencies.

The application features:
- A form interface for entering client and item details
- Dynamic addition and removal of appraised articles
- Local storage to preserve form data between sessions
- Print functionality for creating physical copies
- Download functionality to save the appraisal as an HTML file

## File Structure

- `index.html`: Contains the main structure of the appraisal form
- `script.js`: Handles all interactive functionality (form handling, local storage, adding/removing articles, printing, downloading)
- `style.css`: Styles the application, including special print styles for generated appraisals

## Development Workflow

### Running the Application

The application is a static website with no build process. To run it:

1. Open the project folder in a local web server
   ```
   # Using Python's built-in HTTP server
   python -m http.server
   
   # Or using Node's http-server if installed
   npx http-server
   ```

2. Navigate to `http://localhost:8000` (or whatever port your local server uses)

### Testing

This project has no automated tests. Manual testing should include:
- Adding and removing articles
- Checking that form data persists after page refresh (local storage)
- Testing the print functionality
- Testing the download functionality
- Verifying the form appearance in different browsers

### Common Tasks

1. **Adding New Form Fields**:
   - Add the HTML element in `index.html`
   - Add a reference in the `formElements` object in `script.js`
   - No additional setup is needed - the existing event listeners will handle local storage

2. **Modifying the PDF/Print Layout**:
   - Adjust the `@media print` section in `style.css`

3. **Extending Download Functionality**:
   - Modify the event listener for the download button in `script.js`
   
### Future Development Notes

The application currently has a placeholder for server-side saving functionality (commented out in the download button event handler). If implementing a backend:

1. Create an API endpoint to receive and store appraisal data
2. Modify the download button handler to send data to this endpoint
3. Consider adding user authentication if multiple appraisers will use the system