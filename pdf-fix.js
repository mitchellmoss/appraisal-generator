// PDF Generation fix
// This file contains a modified version of the PDF generation code

// Fix for the PDF download function
function generatePDF() {
    const clientName = document.getElementById("clientName").value.trim().replace(/[^a-zA-Z0-9]/g, "_") || "CLIENTNAME";
    const currentDate = new Date().toISOString().slice(0, 10);
    const fileName = `appraisal_${clientName}_${currentDate}.pdf`;

    // 1. Clone the container
    const container = document.querySelector(".container").cloneNode(true);

    // 2. Create a wrapper with the pdf-mode class to trigger our PDF-specific styles
    const pdfModeWrapper = document.createElement('div');
    pdfModeWrapper.className = 'pdf-mode';

    // Add specific styling to the container
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.minHeight = '297mm';

    pdfModeWrapper.appendChild(container);

    // 3. Make sure the appraiser section is at the bottom
    const appraiserWrapper = container.querySelector(".appraiser-section-wrapper");
    if (appraiserWrapper) {
        appraiserWrapper.style.marginTop = "auto";
    }

    // 4. Make sure the header-top-border is visible
    const headerTopBorder = container.querySelector(".header-top-border");
    if (headerTopBorder) {
        headerTopBorder.style.display = "block";
    }

    // 5. Replace inputs with static content
    container.querySelectorAll("input[type=\"text\"], input[type=\"date\"], textarea").forEach(input => {
        if (input.value) {
            // For date inputs, format nicely
            if (input.type === "date" && input.value) {
                const date = new Date(input.value);
                if (!isNaN(date.getTime())) {
                    const formattedDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    input.outerHTML = `<div class="input-value">${formattedDate}</div>`;
                }
            } else {
                // Create a div with the input's value
                input.outerHTML = `<div class="input-value">${input.value}</div>`;
            }
        } else {
            // For empty inputs, add a placeholder line
            input.outerHTML = `<div class="input-value">&nbsp;</div>`;
        }
    });

    // 6. Remove buttons and controls
    container.querySelectorAll(".action-buttons, #addArticleBtn, .removeArticleBtn").forEach(el => {
        el.remove();
    });

    // 7. Add the wrapper to the document for PDF generation
    document.body.appendChild(pdfModeWrapper);
    // We need the element to be visible for html2pdf to render it properly
    pdfModeWrapper.style.position = "fixed";
    pdfModeWrapper.style.top = "0";
    pdfModeWrapper.style.left = "0";
    pdfModeWrapper.style.zIndex = "-1000"; // Keep it behind other content
    pdfModeWrapper.style.opacity = "0.01"; // Nearly invisible but still rendered

    // 8. Set client info data attributes for proper display
    // First update the main container's data attributes
    const clientNameInput = document.getElementById("clientName");
    const address1Input = document.getElementById("address1");
    const address2Input = document.getElementById("address2");
    
    const clientInfoSection = container.querySelector(".client-info");
    if (clientInfoSection) {
        clientInfoSection.setAttribute("data-client-name", clientNameInput.value || "");
        clientInfoSection.setAttribute("data-address1", address1Input.value || "");
        clientInfoSection.setAttribute("data-address2", address2Input.value || "");
    }

    // 9. Configure html2pdf options
    const options = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 1.0 }, // Higher quality
        html2canvas: {
            scale: 2, // Better resolution
            useCORS: true,
            letterRendering: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
        }
    };

    try {
        // 10. Generate PDF - use a promise to handle async operations
        return new Promise((resolve, reject) => {
            // Add some visual styling to ensure content renders properly
            pdfModeWrapper.style.width = '210mm';
            pdfModeWrapper.style.minHeight = '297mm';

            // Force layout recalculation
            void pdfModeWrapper.offsetWidth;

            // Create the worker with all options
            const worker = html2pdf()
                .from(pdfModeWrapper)
                .set(options)
                .save()
                .then(() => {
                    console.log("PDF generation completed");

                    // Remove the temporary element
                    if (document.body.contains(pdfModeWrapper)) {
                        document.body.removeChild(pdfModeWrapper);
                    }

                    resolve(true);
                })
                .catch(err => {
                    console.error("PDF generation failed:", err);

                    // Clean up
                    if (document.body.contains(pdfModeWrapper)) {
                        document.body.removeChild(pdfModeWrapper);
                    }

                    reject(err);
                });
        });
    } catch (error) {
        console.error('Error initiating PDF generation:', error);

        // Clean up
        if (document.body.contains(pdfModeWrapper)) {
            document.body.removeChild(pdfModeWrapper);
        }

        return Promise.reject(error);
    }
}

// Hook into the download button click event when the page loads
document.addEventListener("DOMContentLoaded", () => {
    const originalDownloadBtn = document.getElementById("downloadBtn");
    
    if (originalDownloadBtn) {
        // Replace or override the original download function
        originalDownloadBtn.addEventListener("click", async (e) => {
            e.preventDefault(); // Prevent default action
            e.stopPropagation(); // Stop event propagation

            try {
                // Generate PDF with our improved function, which now returns a Promise
                await generatePDF();

                // If we get here, PDF generation was successful
                console.log("PDF generated successfully");

                // Save to server if that code exists
                try {
                    // Get the getAppraisalData and saveAppraisalToServer functions from the window scope
                    // This works because script-fixed.js defines them
                    const form = document.querySelector(".container");
                    if (form) {
                        // Get client data
                        const clientName = document.getElementById("clientName").value || "";
                        const address1 = document.getElementById("address1").value || "";
                        const address2 = document.getElementById("address2").value || "";
                        const appraisalDate = document.getElementById("appraisalDate").value || "";
                        const appraisedValue = document.getElementById("appraisedValue").value || "";
                        const appraiserName = document.getElementById("appraiserName").value || "";

                        // Get articles
                        const articles = [];
                        form.querySelectorAll(".article").forEach(articleDiv => {
                            const articleText = articleDiv.querySelector("textarea")?.value || "";
                            articles.push({ description: articleText });
                        });

                        // Create appraisal data object
                        const appraisalData = {
                            clientName,
                            address1,
                            address2,
                            appraisalDate,
                            appraisedValue,
                            appraiserName,
                            articles,
                            generatedAt: new Date().toISOString()
                        };

                        // Try server saving if API endpoint exists
                        try {
                            // Check if we have a current appraisal ID in the UI
                            const currentAppraisalId = document.getElementById("currentAppraisalId")?.textContent || "";
                            const editingNotice = document.getElementById("editingNotice");
                            const isEditing = editingNotice && window.getComputedStyle(editingNotice).display !== 'none';

                            let id = null;
                            if (isEditing && currentAppraisalId) {
                                const match = currentAppraisalId.match(/ID:\s+([a-zA-Z0-9]+)/);
                                if (match && match[1]) {
                                    id = match[1];
                                }
                            }

                            // Determine if we're updating or creating
                            const isUpdate = !!id;
                            const method = isUpdate ? 'PUT' : 'POST';
                            const url = isUpdate ? `/api/appraisals/${id}` : '/api/appraisals';

                            // Send to server
                            const response = await fetch(url, {
                                method: method,
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(appraisalData)
                            });

                            if (response.ok) {
                                console.log('Appraisal saved to server');
                            }
                        } catch (serverError) {
                            console.log('Server saving not available or failed:', serverError);
                        }
                    }
                } catch (error) {
                    console.error('Failed to save appraisal to server:', error);
                }
            } catch (error) {
                console.error('PDF generation failed:', error);
                alert('There was an error generating the PDF. Please try again.');
            }

            return false; // Prevent default action
        }, true); // Use capture phase to ensure our handler runs first
    }
});