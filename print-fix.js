// Print Fix - Ensures the appraisal fits on a single page
document.addEventListener("DOMContentLoaded", () => {
    // Find the print button
    const printBtn = document.getElementById("printBtn");
    
    if (printBtn) {
        // Override the default print functionality
        printBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Make sure all data attributes are updated before printing
            updateClientInfoAttributes();
            
            // Create a style element for print-specific styles
            const printStyle = document.createElement('style');
            printStyle.id = 'single-page-print-style';
            printStyle.textContent = `
                @media print {
                    @page {
                        size: letter; /* US Letter size (8.5 x 11 inches) */
                        margin: 0; /* No margins */
                    }
                    
                    body {
                        background: white;
                        font-size: 12pt;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .container {
                        width: 100% !important;
                        max-width: 100% !important;
                        height: 11in !important;
                        padding: 0.3in !important; /* Reduced padding */
                        margin: 0 !important;
                        box-sizing: border-box !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: hidden !important;
                        page-break-inside: avoid !important;
                        page-break-after: avoid !important;
                        page-break-before: avoid !important;
                        transform: scale(0.95) !important; /* Slightly scale down content */
                        transform-origin: top center !important;
                    }
                    
                    /* Compress content to fit on one page */
                    header {
                        margin-bottom: 10px !important;
                        padding-bottom: 10px !important;
                    }

                    header h1 {
                        font-size: 2em !important;
                    }

                    .logo-placeholder {
                        width: 50px !important;
                        height: 50px !important;
                    }
                    
                    .certification-statement {
                        margin-bottom: 10px !important;
                    }
                    
                    .client-info {
                        margin-bottom: 10px !important;
                        padding-bottom: 10px !important;
                    }
                    
                    .article-description-section h2 {
                        margin-bottom: 10px !important;
                        padding: 5px !important;
                        font-size: 1em !important;
                    }

                    .article {
                        padding: 6px 0 !important;
                        margin-bottom: 6px !important;
                    }

                    .article textarea {
                        min-height: auto !important;
                        height: 40px !important; /* Reduced height */
                    }

                    /* Further reduce size if there are many articles */
                    .article:nth-child(n+3) textarea {
                        height: 30px !important;
                    }
                    
                    .appraised-value {
                        margin-top: 10px !important;
                        margin-bottom: 15px !important;
                    }
                    
                    .appraiser-section-wrapper {
                        padding-top: 0 !important;
                        margin-top: 5px !important;
                    }

                    .appraiser-signature {
                        padding-top: 20px !important; /* Reduced padding */
                    }

                    footer {
                        margin-top: 5px !important;
                        padding-top: 5px !important;
                    }

                    .disclaimer {
                        font-size: 6pt !important; /* Smaller font */
                        line-height: 1.1 !important;
                        margin-bottom: 0 !important;
                    }
                    
                    .action-buttons, #addArticleBtn, .removeArticleBtn {
                        display: none !important;
                    }
                }
            `;
            
            // Add the style element to the head
            document.head.appendChild(printStyle);
            
            // Check how many articles we have and adjust scaling if needed
            const articleCount = document.querySelectorAll('.article').length;
            if (articleCount > 3) {
                // Add additional scaling for many articles
                const extraScaleStyle = document.createElement('style');
                extraScaleStyle.id = 'extra-scale-style';
                extraScaleStyle.textContent = `
                    @media print {
                        .container {
                            transform: scale(${0.95 - (articleCount - 3) * 0.02}) !important;
                        }

                        .article textarea {
                            height: ${Math.max(20, 40 - (articleCount - 3) * 5)}px !important;
                        }
                    }
                `;
                document.head.appendChild(extraScaleStyle);
            }

            // Print the page
            window.print();

            // Remove the style elements after printing
            setTimeout(() => {
                const styleElement = document.getElementById('single-page-print-style');
                if (styleElement) {
                    styleElement.remove();
                }

                const extraScaleElement = document.getElementById('extra-scale-style');
                if (extraScaleElement) {
                    extraScaleElement.remove();
                }
            }, 1000);
        }, true); // Use capture phase to override existing listeners
    }
    
    // Helper function to update client info attributes
    function updateClientInfoAttributes() {
        const clientInfoSection = document.querySelector(".client-info");
        const clientNameInput = document.getElementById("clientName");
        const address1Input = document.getElementById("address1");
        const address2Input = document.getElementById("address2");
        
        if (clientInfoSection && clientNameInput && address1Input && address2Input) {
            clientInfoSection.setAttribute("data-client-name", clientNameInput.value || "");
            clientInfoSection.setAttribute("data-address1", address1Input.value || "");
            clientInfoSection.setAttribute("data-address2", address2Input.value || "");
        }
    }
});