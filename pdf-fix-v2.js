// PDF Fix Version 2 - Using browser's native print-to-PDF functionality
// This approach is much more reliable than html2pdf

document.addEventListener("DOMContentLoaded", () => {
    // Check if downloadBtn exists before trying to add event listener
    const downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 1. Create a print-specific iframe
            const printFrame = document.createElement('iframe');
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            
            document.body.appendChild(printFrame);
            
            // 2. Access the iframe's document
            const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;
            
            // 3. Create a complete HTML document for printing
            frameDoc.open();
            frameDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Appraisal</title>
                    <style>
                        /* Print specific settings - US Letter size */
                        @page {
                            size: letter; /* US Letter size (8.5 x 11 inches) */
                            margin: 0; /* No margins */
                        }

                        /* Base styles */
                        body {
                            font-family: 'Times New Roman', Times, serif;
                            background-color: #fff;
                            padding: 0;
                            margin: 0;
                            min-height: 100vh;
                            -webkit-print-color-adjust: exact; /* Enable color printing in Chrome */
                            color-adjust: exact; /* Enable color printing in Firefox */
                            print-color-adjust: exact; /* Standard property */
                        }

                        /* Reset container styles */
                        .container {
                            width: 8.5in; /* US Letter width */
                            height: 11in; /* US Letter height */
                            padding: 0.5in; /* Half-inch padding */
                            margin: 0 auto;
                            background-color: #fff;
                            box-sizing: border-box;
                            position: relative;
                            border: none;
                            box-shadow: none;
                            display: flex;
                            flex-direction: column;
                        }
                        
                        /* Header styles */
                        header {
                            text-align: center;
                            margin-bottom: 20px;
                            padding-bottom: 20px;
                            border-bottom: none;
                            position: relative;
                        }
                        
                        .logo-container {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 20px;
                        }
                        
                        .logo-placeholder {
                            width: 60px;
                            height: 60px;
                            border: 2px solid #d4af37; /* Gold border */
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 2em;
                            font-weight: bold;
                            border-radius: 50%;
                            background-color: #f9f5e9; /* Light cream background */
                            color: #d4af37; /* Gold text */
                        }

                        h1 {
                            margin: 0;
                            font-size: 2.5em;
                            font-weight: normal;
                            letter-spacing: 2px;
                            color: #333; /* Dark gray text */
                            position: relative;
                        }

                        /* Decorative gold lines */
                        h1::before, h1::after {
                            content: "";
                            position: absolute;
                            top: 50%;
                            width: 40px;
                            height: 1px;
                            background-color: #d4af37; /* Gold line */
                        }

                        h1::before {
                            left: -50px;
                        }

                        h1::after {
                            right: -50px;
                        }
                        
                        .company-info p {
                            margin: 2px 0;
                            font-size: 0.9em;
                        }
                        
                        /* Content sections */
                        .certification-statement {
                            margin-bottom: 20px;
                            text-align: left;
                        }
                        
                        .client-info {
                            display: block;
                            margin-bottom: 25px;
                            padding-bottom: 20px;
                            border-bottom: 1px solid #d4af37; /* Gold border */
                            border-top: 1px solid #d4af37; /* Gold border */
                            padding-top: 20px;
                            position: relative;
                        }

                        .client-info::before {
                            content: attr(data-client-name) '\\A' attr(data-address1) '\\A' attr(data-address2);
                            white-space: pre-line;
                            position: absolute;
                            top: 20px; /* Match padding-top */
                            left: 0;
                            font-family: 'Times New Roman', serif;
                            font-size: 14pt;
                            color: #333;
                        }

                        .client-info .static-date {
                            position: absolute;
                            top: 20px; /* Match padding-top */
                            right: 0;
                            text-align: right;
                            font-weight: bold;
                            color: #333;
                            font-size: 14pt;
                        }
                        
                        .article-description-section {
                            margin-bottom: 20px;
                        }
                        
                        .article-description-section h2 {
                            text-align: center;
                            font-size: 1.2em;
                            padding: 10px;
                            margin-bottom: 15px;
                            background-color: #f9f5e9; /* Light cream background */
                            color: #333;
                            border-top: 1px solid #d4af37; /* Gold border */
                            border-bottom: 1px solid #d4af37; /* Gold border */
                            letter-spacing: 1.5px;
                        }

                        .article {
                            border-bottom: 1px dotted #d4af37; /* Dotted gold border */
                            padding: 15px 0;
                            margin-bottom: 15px;
                        }

                        .article-content {
                            white-space: pre-line;
                            line-height: 1.5;
                            color: #333;
                            font-size: 12pt;
                        }

                        .appraised-value {
                            text-align: right;
                            margin-top: 20px;
                            margin-bottom: 30px;
                            font-size: 1.2em;
                            font-weight: bold;
                            color: #333;
                            padding: 5px 0;
                            border-bottom: 2px solid #d4af37; /* Bold gold border */
                            display: inline-block;
                            position: relative;
                            left: 60%;
                        }
                        
                        /* Appraiser section and footer - bottom weighted */
                        .appraiser-section-wrapper {
                            margin-top: auto;
                            display: flex;
                            flex-direction: column;
                            padding-top: 30px; /* Extra space above */
                        }

                        .appraiser-signature {
                            padding-top: 80px; /* Extended space for signature */
                            border-top: 1px solid #000; /* Keep black for formal signature line */
                            text-align: center;
                            position: relative;
                        }

                        /* Add a subtle signature line indicator */
                        .appraiser-signature::before {
                            content: "";
                            position: absolute;
                            top: 40px; /* Middle of the padding space */
                            left: 50%;
                            transform: translateX(-50%);
                            width: 150px;
                            height: 1px;
                            border-bottom: 1px dotted #aaa; /* Subtle dotted line */
                            opacity: 0.5;
                        }

                        .appraiser-signature div {
                            font-size: 14pt;
                            font-weight: normal;
                            color: #333;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }

                        footer {
                            margin-top: 25px;
                            padding-top: 15px;
                            border-top: 1px solid #d4af37; /* Gold border */
                            text-align: center;
                        }

                        .disclaimer {
                            font-size: 0.85em;
                            color: #666;
                            line-height: 1.5;
                            max-width: 90%;
                            margin: 0 auto;
                        }

                        /* Certificate-like decorative element */
                        footer::after {
                            content: "OFFICIAL JEWELRY APPRAISAL";
                            display: block;
                            margin-top: 10px;
                            font-size: 0.75em;
                            color: #d4af37;
                            opacity: 0.3;
                            letter-spacing: 3px;
                            transform: rotate(-5deg);
                            font-weight: bold;
                        }
                        
                        /* Hide form controls */
                        input, textarea, button, .form-group, .action-buttons {
                            display: none;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <!-- Header -->
                        <header>
                            <div class="logo-container">
                                <div class="logo-placeholder">D</div>
                                <div>
                                    <h1>APPRAISAL</h1>
                                    <div class="company-info">
                                        <p>Debbie Noble Designs</p>
                                        <p>333 Washington Street, Boston MA 02108</p>
                                        <p>(508)380-2661</p>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <!-- Certification Statement -->
                        <section class="certification-statement">
                            <p>We herewith certify that we have this day carefully examined the following listed and described articles, the property of:</p>
                        </section>

                        <!-- Client Info -->
                        <section class="client-info" 
                            data-client-name="${document.getElementById('clientName')?.value || ''}" 
                            data-address1="${document.getElementById('address1')?.value || ''}" 
                            data-address2="${document.getElementById('address2')?.value || ''}">
                            <div class="static-date">
                                ${formatDate(document.getElementById('appraisalDate')?.value)}
                            </div>
                        </section>

                        <!-- Articles -->
                        <section class="article-description-section">
                            <h2>DESCRIPTION OF ARTICLE</h2>
                            <div id="articlesContainer">
                                ${getArticlesHTML()}
                            </div>
                        </section>

                        <!-- Appraised Value -->
                        <section class="appraised-value">
                            <div>Appraised Value: ${document.getElementById('appraisedValue')?.value || '$0.00'}</div>
                        </section>

                        <!-- Bottom-weighted appraiser section and footer -->
                        <div class="appraiser-section-wrapper">
                            <section class="appraiser-signature">
                                <div>${document.getElementById('appraiserName')?.value || 'Appraiser'}</div>
                            </section>

                            <footer>
                                <p class="disclaimer">
                                    We estimate the Value as listed for Insurance or other purposes at the Current Retail Value, excluding Federal and other taxes.
                                    In making this Appraisal, we DO NOT agree to purchase or replace the article(s) listed above.
                                    The foregoing Appraisal is made with the understanding that the Appraiser assumes no liability with the respect to any action that may be taken on the basis of this Appraisal.
                                </p>
                            </footer>
                        </div>
                    </div>
                    <script>
                        // Print automatically when loaded
                        window.onload = function() {
                            window.print();
                            
                            // After print dialog closes or is canceled, remove the iframe
                            setTimeout(function() {
                                window.parent.document.body.removeChild(window.frameElement);
                            }, 1000);
                        };
                    </script>
                </body>
                </html>
            `);
            frameDoc.close();
            
            // Save to server if that functionality exists (only log for now)
            console.log('Saving appraisal data to server (if server exists)');
            
            // Prevent default action
            return false;
        }, true);
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }
    
    // Helper function to get all articles HTML
    function getArticlesHTML() {
        const articles = [];
        document.querySelectorAll('.article textarea').forEach(textarea => {
            articles.push(`
                <div class="article">
                    <div class="article-content">${textarea.value || ''}</div>
                </div>
            `);
        });
        
        return articles.join('');
    }
});