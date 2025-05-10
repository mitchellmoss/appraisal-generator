// Print Fix - Ensures the appraisal fits on a single page and saves to server
document.addEventListener("DOMContentLoaded", () => {
    // Find the print button
    const printBtn = document.getElementById("printBtn");

    if (printBtn) {
        // Override the default print functionality
        printBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Make sure all data attributes are updated before printing
            updateClientInfoAttributes();

            // Save to server first
            try {
                // Get the appraisal data using the function from script-fixed.js
                const appraisalData = window.getAppraisalData ? window.getAppraisalData() : getAppraisalData();

                // Only try to save if we have required fields
                if (appraisalData && appraisalData.clientName) {
                    try {
                        // Save to server using the function from script-fixed.js
                        const saveResult = await (window.saveAppraisalToServer ?
                            window.saveAppraisalToServer(appraisalData) :
                            saveAppraisalToServer(appraisalData));

                        // Show a subtle notification that data was saved
                        showNotification("Appraisal saved to server successfully", "success");

                        // Update the window.currentAppraisal to ensure it has the correct ID
                        if (saveResult && saveResult.id && typeof window.currentAppraisal !== 'undefined') {
                            window.currentAppraisal = window.currentAppraisal || {};
                            window.currentAppraisal.id = saveResult.id;

                            // Update the UI to show we're editing this appraisal
                            const editingNotice = document.getElementById("editingNotice");
                            const currentAppraisalIdElem = document.getElementById("currentAppraisalId");
                            if (editingNotice && currentAppraisalIdElem) {
                                editingNotice.style.display = "block";
                                currentAppraisalIdElem.textContent = `${appraisalData.clientName} (ID: ${saveResult.id})`;
                            }
                        }
                    } catch (saveError) {
                        // If this is an error about ID, just create a new appraisal
                        if (saveError.message && saveError.message.includes('ID')) {
                            try {
                                // Try to create a new appraisal instead of updating
                                const createResult = await fetch('/api/appraisals', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(appraisalData)
                                });

                                if (createResult.ok) {
                                    const result = await createResult.json();
                                    showNotification("Created new appraisal instead of updating", "success");

                                    // Update currentAppraisal with the new ID
                                    if (result && result.id && typeof window !== 'undefined') {
                                        window.currentAppraisal = {
                                            id: result.id,
                                            ...appraisalData
                                        };
                                    }
                                } else {
                                    throw new Error("Failed to create new appraisal");
                                }
                            } catch (createError) {
                                console.error("Error creating new appraisal:", createError);
                                showNotification("Could not save to server. Will continue with printing.", "error");
                            }
                        } else {
                            console.error("Error saving appraisal to server:", saveError);
                            showNotification("Could not save to server. Will continue with printing.", "error");
                        }
                    }
                } else {
                    console.log("Skipping save - missing required fields");
                    showNotification("Complete client name field to save appraisal", "info");
                }
            } catch (error) {
                console.error("Error in print-save process:", error);
                // Show error notification but continue with printing
                showNotification("Could not save to server. Will continue with printing.", "error");
            }

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
                        /* transform: scale(0.95) !important; */ /* Slightly scale down content - REMOVED to prevent whitespace */
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

                    .action-buttons, #addArticleBtn, .removeArticleBtn, .notification {
                        display: none !important;
                    }
                }
            `;

            // Add the style element to the head
            document.head.appendChild(printStyle);

            // Check how many articles we have and adjust scaling if needed
            const articleCount = document.querySelectorAll('.article').length;
            // if (articleCount > 3) { // REMOVED SCALING LOGIC
                // Add additional scaling for many articles
                // const extraScaleStyle = document.createElement('style');
                // extraScaleStyle.id = 'extra-scale-style';
                // extraScaleStyle.textContent = `
                //     @media print {
                //         .container {
                //             transform: scale(${0.95 - (articleCount - 3) * 0.02}) !important;
                //         }
                //
                //         .article textarea {
                //             height: ${Math.max(20, 40 - (articleCount - 3) * 5)}px !important;
                //         }
                //     }
                // `;
                // document.head.appendChild(extraScaleStyle);
            // }

            // Print the page
            window.print();

            // Remove the style elements after printing
            setTimeout(() => {
                const styleElement = document.getElementById('single-page-print-style');
                if (styleElement) {
                    styleElement.remove();
                }

                // const extraScaleElement = document.getElementById('extra-scale-style'); // REMOVED SCALING LOGIC
                // if (extraScaleElement) {
                //     extraScaleElement.remove();
                // }
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

    // Notification function for success/error feedback
    function showNotification(message, type = 'info') {
        // Check if notification container exists, create if not
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.top = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '9999';
            document.body.appendChild(notificationContainer);
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style the notification
        notification.style.padding = '12px 20px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 3.7s';
        notification.style.fontFamily = 'Arial, sans-serif';

        // Type-specific styling
        if (type === 'success') {
            notification.style.backgroundColor = '#4CAF50';
            notification.style.color = 'white';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#F44336';
            notification.style.color = 'white';
        } else {
            notification.style.backgroundColor = '#2196F3';
            notification.style.color = 'white';
        }

        // Add the notification to the container
        notificationContainer.appendChild(notification);

        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    // Add animation styles
    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(animationStyle);

    // Define getAppraisalData if not already defined in script-fixed.js
    if (!window.getAppraisalData) {
        window.getAppraisalData = function() {
            // Collect form data
            const formData = {};
            const formElements = {
                clientName: document.getElementById("clientName"),
                address1: document.getElementById("address1"),
                address2: document.getElementById("address2"),
                appraisalDate: document.getElementById("appraisalDate"),
                appraiserName: document.getElementById("appraiserName"),
                appraisedValue: document.getElementById("appraisedValue")
            };

            for (const key in formElements) {
                if (formElements[key]) {
                    formData[key] = formElements[key].value;
                }
            }

            // Collect articles data
            const articles = [];
            const articlesContainer = document.getElementById("articlesContainer");
            articlesContainer.querySelectorAll(".article").forEach(articleDiv => {
                const articleText = articleDiv.querySelector("textarea").value;
                const appraisedValue = articleDiv.querySelector("input[id^='appraisedValue-']").value;
                articles.push({
                    description: articleText,
                    appraisedValue: appraisedValue
                });
            });

            // Calculate the total appraised value from articles
            let totalAppraisedValue = '';
            if (articles.length > 0) {
                let total = 0;
                articles.forEach(article => {
                    const value = article.appraisedValue.replace(/[^0-9.-]+/g, "");
                    if (value && !isNaN(parseFloat(value))) {
                        total += parseFloat(value);
                    }
                });

                // Format the total with dollar sign
                if (total > 0) {
                    totalAppraisedValue = "$" + total.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                }
            }

            // Return complete appraisal data with the calculated total
            let completeData = {
                ...formData,
                articles: articles,
                appraisedValue: totalAppraisedValue,
                generatedAt: new Date().toISOString()
            };

            // If there's a current appraisal ID, include it for potential updates
            if (window.currentAppraisal && window.currentAppraisal.id) {
                completeData.id = window.currentAppraisal.id;
            }

            return completeData;
        };
    }

    // Define saveAppraisalToServer if not already defined in script-fixed.js
    if (!window.saveAppraisalToServer) {
        window.saveAppraisalToServer = async function(appraisalData) {
            try {
                // Determine if this is an update based on appraisalData containing an ID
                const isUpdate = !!appraisalData.id;
                const method = isUpdate ? 'PUT' : 'POST';
                let url = '/api/appraisals';

                if (isUpdate) {
                    // Ensure the ID is not truncated if it came from a display element somehow
                    // though ideally window.currentAppraisal.id is the clean source.
                    if (String(appraisalData.id).endsWith('...')) {
                        console.log("ID is truncated, cannot use for API call. Appraisal ID:", appraisalData.id);
                        return Promise.reject(new Error("Cannot update with a truncated ID. Creating a new appraisal instead."));
                    }
                    url = `/api/appraisals/${appraisalData.id}`;
                }

                // Create a shallow copy of appraisalData to remove 'id' from the body for POST requests
                // For PUT requests, the ID is in the URL, and some backends might not want it in the body.
                // However, many REST APIs are fine with ID in body for PUT. We'll send it for now.
                // If creating (POST), we definitely don't want to send an 'id' field in the body.
                const payload = { ...appraisalData };
                if (method === 'POST') {
                    delete payload.id; // Ensure no ID is sent when creating a new record
                }


                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save appraisal');
                }

                const result = await response.json();
                return result;

            } catch (error) {
                console.error('Error saving appraisal:', error);
                throw error;
            }
        };
    }
});