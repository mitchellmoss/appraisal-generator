document.addEventListener("DOMContentLoaded", () => {
    const clientNameInput = document.getElementById("clientName");
    const address1Input = document.getElementById("address1");
    const address2Input = document.getElementById("address2");
    const appraisalDateInput = document.getElementById("appraisalDate");
    const appraisedValueInput = document.getElementById("appraisedValue");
    const appraiserNameInput = document.getElementById("appraiserName");
    const articlesContainer = document.getElementById("articlesContainer");
    const addArticleBtn = document.getElementById("addArticleBtn");
    const printBtn = document.getElementById("printBtn");
    const downloadBtn = document.getElementById("downloadBtn");

    const formElements = {
        clientName: clientNameInput,
        address1: address1Input,
        address2: address2Input,
        appraisalDate: appraisalDateInput,
        appraisedValue: appraisedValueInput,
        appraiserName: appraiserNameInput,
    };

    // Load data from local storage
    function loadFormData() {
        for (const key in formElements) {
            if (formElements[key]) {
                const savedValue = localStorage.getItem(key);
                if (savedValue) {
                    formElements[key].value = savedValue;
                }
            }
        }
        const savedArticles = JSON.parse(localStorage.getItem("articles"));
        if (savedArticles) {
            savedArticles.forEach(articleData => addArticle(articleData, false));
        }
    }

    // Save data to local storage
    function saveFormData() {
        for (const key in formElements) {
            if (formElements[key]) {
                localStorage.setItem(key, formElements[key].value);
            }
        }
        const articles = [];
        articlesContainer.querySelectorAll(".article").forEach(articleDiv => {
            const articleText = articleDiv.querySelector("textarea").value;
            articles.push({ description: articleText });
        });
        localStorage.setItem("articles", JSON.stringify(articles));
    }

    // Add event listeners to save data on input change
    for (const key in formElements) {
        if (formElements[key]) {
            formElements[key].addEventListener("input", saveFormData);
        }
    }

    // Function to add a new article section
    function addArticle(articleData = { description: "" }, shouldSave = true) {
        const articleId = `article-${Date.now()}`;
        const articleDiv = document.createElement("div");
        articleDiv.classList.add("article");
        articleDiv.id = articleId;

        const descriptionGroup = document.createElement("div");
        descriptionGroup.classList.add("form-group");

        const descriptionLabel = document.createElement("label");
        descriptionLabel.setAttribute("for", `description-${articleId}`);
        descriptionLabel.textContent = "Article Description:";

        const descriptionTextarea = document.createElement("textarea");
        descriptionTextarea.id = `description-${articleId}`;
        descriptionTextarea.name = `description-${articleId}`;
        descriptionTextarea.value = articleData.description;
        descriptionTextarea.addEventListener("input", saveFormData); // Save on edit

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.classList.add("removeArticleBtn");
        removeBtn.textContent = "Remove Article";
        removeBtn.addEventListener("click", () => {
            articleDiv.remove();
            saveFormData(); // Update local storage after removal
        });

        descriptionGroup.appendChild(descriptionLabel);
        descriptionGroup.appendChild(descriptionTextarea);
        articleDiv.appendChild(descriptionGroup);
        articleDiv.appendChild(removeBtn);
        articlesContainer.appendChild(articleDiv);

        if (shouldSave) {
            saveFormData();
        }
    }

    addArticleBtn.addEventListener("click", () => addArticle());

    // Print functionality
    printBtn.addEventListener("click", () => {
        window.print();
    });

    // Get appraisal data for saving
    function getAppraisalData() {
        // Collect form data
        const formData = {};
        for (const key in formElements) {
            if (formElements[key]) {
                formData[key] = formElements[key].value;
            }
        }

        // Collect articles data
        const articles = [];
        articlesContainer.querySelectorAll(".article").forEach(articleDiv => {
            const articleText = articleDiv.querySelector("textarea").value;
            articles.push({ description: articleText });
        });

        // Return complete appraisal data
        return {
            ...formData,
            articles: articles,
            generatedAt: new Date().toISOString()
        };
    }

    // Save appraisal to server
    async function saveAppraisalToServer(appraisalData) {
        try {
            const response = await fetch('/api/appraisals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appraisalData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save appraisal');
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving appraisal:', error);
            throw error;
        }
    }

    // Download functionality
    downloadBtn.addEventListener("click", async () => {
        const clientName = clientNameInput.value.trim().replace(/[^a-zA-Z0-9]/g, "_") || "CLIENTNAME";
        const currentDate = new Date().toISOString().slice(0, 10);
        const fileName = `appraisal_${clientName}_${currentDate}.pdf`;

        // Create a clone of the printable content
        const printableContent = document.querySelector(".container").cloneNode(true);

        // Remove buttons from the cloned content
        printableContent.querySelectorAll(".action-buttons, #addArticleBtn, .removeArticleBtn").forEach(el => el.remove());

        // Save inputs' current values
        printableContent.querySelectorAll("input[type=\"text\"], input[type=\"date\"], textarea").forEach(input => {
            if (input.value) {
                // For date inputs specifically, format the date nicely
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
                    // Create a span with the input's value
                    input.outerHTML = `<div class="input-value">${input.value}</div>`;
                }
            } else {
                // For empty inputs, add a spaceholder line
                input.outerHTML = `<div class="input-value">&nbsp;</div>`;
            }
        });

        // Add a special class for PDF generation to trigger print styles
        const pdfContainer = document.createElement('div');
        pdfContainer.className = 'pdf-container';
        pdfContainer.appendChild(printableContent);
        document.body.appendChild(pdfContainer);

        // Configure html2pdf options
        const options = {
            margin: 0,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            }
        };

        try {
            // Temporarily apply print styles to the cloned container
            const tempStyle = document.createElement('style');
            tempStyle.innerHTML = `
                .pdf-container {
                    width: 210mm;
                    height: 297mm;
                    overflow: hidden;
                    position: relative;
                    padding: 0;
                    margin: 0 auto;
                }

                .pdf-container .container {
                    background-color: #fff;
                    padding: 10mm;
                    position: relative;
                    width: 210mm;
                    height: 297mm;
                    box-sizing: border-box;
                    margin: 0 auto;
                    background-image:
                        radial-gradient(circle at 30px 30px, #f9f1de 2px, transparent 2px),
                        radial-gradient(circle at calc(100% - 30px) 30px, #f9f1de 2px, transparent 2px),
                        radial-gradient(circle at 30px calc(100% - 30px), #f9f1de 2px, transparent 2px),
                        radial-gradient(circle at calc(100% - 30px) calc(100% - 30px), #f9f1de 2px, transparent 2px);
                    font-family: 'Playfair Display', 'Libre Baskerville', 'Bodoni MT', 'Didot', 'Times New Roman', serif;
                }

                .pdf-container .container::before {
                    content: '';
                    position: absolute;
                    top: 5mm;
                    left: 5mm;
                    right: 5mm;
                    bottom: 5mm;
                    border: 1px solid #d4af37;
                    pointer-events: none;
                    z-index: 1;
                }

                .pdf-container .container::after {
                    content: '';
                    position: absolute;
                    top: 7mm;
                    left: 7mm;
                    right: 7mm;
                    bottom: 7mm;
                    border: 1px double #d4af37;
                    pointer-events: none;
                    z-index: 1;
                }

                .pdf-container header,
                .pdf-container footer {
                    position: relative;
                }

                .pdf-container header::before,
                .pdf-container header::after,
                .pdf-container footer::before,
                .pdf-container footer::after {
                    content: '✦';
                    position: absolute;
                    font-size: 18pt;
                    color: #d4af37;
                }

                .pdf-container header::before {
                    top: 0;
                    left: 15mm;
                }

                .pdf-container header::after {
                    top: 0;
                    right: 15mm;
                }

                .pdf-container footer::before {
                    bottom: 5mm;
                    left: 15mm;
                }

                .pdf-container footer::after {
                    bottom: 5mm;
                    right: 15mm;
                }

                .pdf-container header {
                    border-bottom: 2px solid #d4af37;
                }

                .pdf-container h1 {
                    font-size: 2.8em;
                    letter-spacing: 3px;
                    color: #333;
                    text-transform: uppercase;
                }

                .pdf-container .logo-placeholder {
                    border: 2px solid #d4af37;
                    background-color: #fff8e7;
                    color: #d4af37;
                }

                .pdf-container .company-info p {
                    font-style: italic;
                    color: #555;
                }

                .pdf-container .certification-statement {
                    text-align: center;
                    font-style: italic;
                }

                .pdf-container .client-info {
                    border-top: 1px solid #d4af37;
                    border-bottom: 1px solid #d4af37;
                }

                .pdf-container .form-group label {
                    font-weight: bold;
                    color: #555;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .pdf-container .input-value {
                    border-bottom: 1px dotted #999;
                    padding: 4px 0;
                    min-height: 1.2em;
                    font-family: 'Playfair Display', 'Libre Baskerville', 'Bodoni MT', 'Didot', 'Times New Roman', serif;
                    font-size: 12pt;
                }

                .pdf-container .article-description-section h2 {
                    background-color: #fff8e7;
                    border-top: 1px solid #d4af37;
                    border-bottom: 1px solid #d4af37;
                    font-weight: normal;
                    letter-spacing: 2px;
                    color: #333;
                    text-transform: uppercase;
                }

                .pdf-container .article {
                    border-bottom: 1px dotted #d4af37;
                    background-color: transparent;
                }

                .pdf-container .appraised-value .input-value {
                    font-weight: bold;
                    color: #333;
                    border-bottom: 2px solid #d4af37;
                }

                .pdf-container .appraiser-signature .form-group {
                    border-top: 1px solid #000;
                    text-align: center;
                }

                .pdf-container footer {
                    border-top: 1px solid #d4af37;
                }

                .pdf-container .disclaimer {
                    color: #666;
                }
            `;
            document.head.appendChild(tempStyle);

            // Generate PDF with custom handling
            const worker = html2pdf().from(pdfContainer).set(options);

            // Add specific handling for scaling and positioning
            worker.toContainer().toCanvas().toPdf().save();

            // Clean up
            document.body.removeChild(pdfContainer);
            document.head.removeChild(tempStyle);

            // Server-side save
            try {
                const appraisalData = getAppraisalData();
                const serverResponse = await saveAppraisalToServer(appraisalData);
                console.log('Appraisal saved to server:', serverResponse);
                alert(`Appraisal downloaded as PDF and saved to server. ID: ${serverResponse.id}`);
            } catch (error) {
                console.error('Failed to save appraisal to server:', error);
                // Don't show error alert here since PDF was successfully generated
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('There was an error generating the PDF. Please try again.');

            // Clean up on error
            if (document.body.contains(pdfContainer)) {
                document.body.removeChild(pdfContainer);
            }
        }
    });

    // Initial load
    loadFormData();
    // Add a default article if none exist
    if (articlesContainer.children.length === 0) {
        addArticle({ description: "Insert Description Here:" }, true);
    }
});

