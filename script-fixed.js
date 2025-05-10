document.addEventListener("DOMContentLoaded", () => {
    // API Key Management
    const API_KEY_STORAGE_KEY = 'appraisalApiKey';

    async function getApiKey() {
        const API_KEY_EXPIRATION_KEY = 'appraisalApiKeyTimestamp';
        const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000;

        let apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        let apiKeyTimestamp = localStorage.getItem(API_KEY_EXPIRATION_KEY);

        if (apiKey && apiKeyTimestamp) {
            const now = new Date().getTime();
            if (now - parseInt(apiKeyTimestamp) < ONE_YEAR_IN_MS) {
                return apiKey; // Key is valid and not expired
            } else {
                // Key expired, clear it
                localStorage.removeItem(API_KEY_STORAGE_KEY);
                localStorage.removeItem(API_KEY_EXPIRATION_KEY);
                apiKey = null; // Force re-prompt
            }
        }

        if (!apiKey) {
            apiKey = prompt("Please enter the API Key to access appraisal data:");
            if (apiKey) {
                localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
                localStorage.setItem(API_KEY_EXPIRATION_KEY, new Date().getTime().toString());
            } else {
                alert("API Key is required to fetch or save data. Please refresh and try again.");
                return null; // Or throw an error
            }
        }
        return apiKey;
    }

    async function getApiHeaders() {
        const apiKey = await getApiKey();
        if (!apiKey) return null; // Handle case where user cancels prompt

        return {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey
        };
    }

    // Form elements
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
    const browseBtn = document.getElementById("browseBtn");
    const clearFormBtn = document.getElementById("clearFormBtn");

    // Function to calculate and update the total appraised value
    function updateTotalAppraisedValue() {
        let total = 0;

        // Get all article appraised value inputs
        const articleValueInputs = articlesContainer.querySelectorAll("input[id^='appraisedValue-']");

        // Sum up the values
        articleValueInputs.forEach(input => {
            // Extract numeric value from the input (removing currency symbols, commas, etc.)
            const value = input.value.replace(/[^0-9.-]+/g, "");
            if (value && !isNaN(parseFloat(value))) {
                total += parseFloat(value);
            }
        });

        // Format the total with commas and dollar sign
        const formattedTotal = total === 0 ? "" : "$" + total.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Update the total appraised value input
        appraisedValueInput.value = formattedTotal;

        // Save to local storage
        localStorage.setItem("appraisedValue", formattedTotal);
    }

    // Modal elements
    const appraisalBrowserModal = document.getElementById("appraisalBrowserModal");
    const closeModalBtn = document.querySelector(".close-modal");
    const appraisalSearch = document.getElementById("appraisalSearch");
    const sortBySelect = document.getElementById("sortBy");
    const appraisalsTableBody = document.getElementById("appraisalsTableBody");
    const appraisalLoadingMessage = document.getElementById("appraisalLoadingMessage");
    const noAppraisalsMessage = document.getElementById("noAppraisalsMessage");

    // Editing notice elements
    const editingNotice = document.getElementById("editingNotice");
    const currentAppraisalId = document.getElementById("currentAppraisalId");

    // Current appraisal being edited
    let currentAppraisal = null;

    // Also make it available in window scope for print-fix.js
    window.currentAppraisal = null;

    const formElements = {
        clientName: clientNameInput,
        address1: address1Input,
        address2: address2Input,
        appraisalDate: appraisalDateInput,
        // appraisedValue is now calculated automatically, not user-edited
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

    // Separate function to update client info data attributes for printing
    function updateClientInfoAttributes() {
        const clientInfoSection = document.querySelector(".client-info");
        if (clientInfoSection) {
            clientInfoSection.setAttribute("data-client-name", clientNameInput.value || "");
            clientInfoSection.setAttribute("data-address1", address1Input.value || "");
            clientInfoSection.setAttribute("data-address2", address2Input.value || "");
        }
    }

    // Save data to local storage and update data attributes for printing
    function saveFormData() {
        // Save to local storage
        for (const key in formElements) {
            if (formElements[key]) {
                localStorage.setItem(key, formElements[key].value);
            }
        }

        // Save articles
        const articles = [];
        articlesContainer.querySelectorAll(".article").forEach(articleDiv => {
            const articleText = articleDiv.querySelector("textarea").value;
            const appraisedValue = articleDiv.querySelector("input[id^='appraisedValue-']").value;
            articles.push({
                description: articleText,
                appraisedValue: appraisedValue
            });
        });
        localStorage.setItem("articles", JSON.stringify(articles));

        // Update data attributes for printing
        updateClientInfoAttributes();
    }

    // Add event listeners to save data on input change
    for (const key in formElements) {
        if (formElements[key]) {
            formElements[key].addEventListener("input", saveFormData);
        }
    }

    // Fetch all appraisals from server
    async function fetchAppraisals() {
        try {
            appraisalLoadingMessage.style.display = "block";
            noAppraisalsMessage.style.display = "none";
            appraisalsTableBody.innerHTML = "";

            const headers = await getApiHeaders();
            if (!headers) return []; // API key prompt was cancelled or empty

            const response = await fetch('/api/appraisals', { headers });
            if (!response.ok) {
                if (response.status === 401) alert('Unauthorized: Invalid or missing API Key.');
                throw new Error('Failed to fetch appraisals');
            }

            const appraisals = await response.json();
            return appraisals;
        } catch (error) {
            console.error('Error fetching appraisals:', error);
            // Do not show alert here as it might be triggered on initial load if key is bad
            return [];
        } finally {
            appraisalLoadingMessage.style.display = "none";
        }
    }

    // Fetch a specific appraisal by ID
    async function fetchAppraisalById(id) {
        try {
            const headers = await getApiHeaders();
            if (!headers) return null;

            const response = await fetch(`/api/appraisals/${id}`, { headers });
            if (!response.ok) {
                if (response.status === 401) alert('Unauthorized: Invalid or missing API Key.');
                throw new Error('Failed to fetch appraisal');
            }

            const appraisal = await response.json();
            return appraisal;
        } catch (error) {
            console.error('Error fetching appraisal:', error);
            alert('Could not load the selected appraisal. Please try again.');
            return null;
        }
    }

    // Delete an appraisal by ID
    async function deleteAppraisal(id) {
        try {
            const confirmDelete = confirm("Are you sure you want to delete this appraisal? This action cannot be undone.");
            if (!confirmDelete) {
                return false;
            }

            const headers = await getApiHeaders();
            if (!headers) return false; // User cancelled API key prompt

            const response = await fetch(`/api/appraisals/${id}`, {
                method: 'DELETE',
                headers: headers
            });

            if (!response.ok) {
                if (response.status === 401) alert('Unauthorized: Invalid or missing API Key.');
                throw new Error('Failed to delete appraisal');
            }

            return true;
        } catch (error) {
            console.error('Error deleting appraisal:', error);
            alert('Could not delete the appraisal. Please try again.');
            return false;
        }
    }

    // Filter and sort appraisals based on search input and sort selection
    function filterAndSortAppraisals(appraisals, searchTerm, sortBy) {
        // Filter by search term (client name)
        let filtered = appraisals;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = appraisals.filter(appraisal =>
                appraisal.clientName.toLowerCase().includes(term)
            );
        }

        // Sort based on selected option
        switch (sortBy) {
            case 'recent':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'clientName':
                filtered.sort((a, b) => a.clientName.localeCompare(b.clientName));
                break;
            case 'value':
                filtered.sort((a, b) => {
                    // Extract numeric value for sorting
                    const getNumericValue = (str) => {
                        if (!str || str === 'Not specified') return 0;
                        // Handle currency formatting and commas
                        return parseFloat(str.replace(/[^\d.-]/g, '')) || 0;
                    };
                    return getNumericValue(b.appraisedValue) - getNumericValue(a.appraisedValue);
                });
                break;
        }

        return filtered;
    }

    // Render the appraisals table
    function renderAppraisalsTable(appraisals) {
        appraisalsTableBody.innerHTML = '';

        if (!appraisals.length) {
            noAppraisalsMessage.style.display = "block";
            return;
        }

        noAppraisalsMessage.style.display = "none";

        appraisals.forEach(appraisal => {
            const row = document.createElement('tr');

            // Format date if available
            let formattedDate = 'N/A';
            if (appraisal.appraisalDate) {
                try {
                    formattedDate = new Date(appraisal.appraisalDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } catch (e) {
                    formattedDate = appraisal.appraisalDate;
                }
            }

            // Get appraised value - either from the top-level property or calculate from articles
            let displayValue = appraisal.appraisedValue || 'Not specified';

            // Format it for display
            if (displayValue && displayValue !== 'Not specified' && !displayValue.startsWith('$')) {
                displayValue = '$' + displayValue;
            }

            row.innerHTML = `
                <td>${appraisal.clientName || 'Unnamed Client'}</td>
                <td>${formattedDate}</td>
                <td>${displayValue}</td>
                <td>
                    <div class="appraisal-actions">
                        <button class="edit-btn" data-id="${appraisal.id}">Edit</button>
                        <button class="delete-btn" data-id="${appraisal.id}">Delete</button>
                    </div>
                </td>
            `;

            appraisalsTableBody.appendChild(row);
        });

        // Add event listeners to the edit and delete buttons
        appraisalsTableBody.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const appraisalId = button.getAttribute('data-id');
                await loadAppraisalForEditing(appraisalId);
                closeAppraisalBrowser();
            });
        });

        appraisalsTableBody.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const appraisalId = button.getAttribute('data-id');
                const deleted = await deleteAppraisal(appraisalId);
                if (deleted) {
                    // Refresh the appraisals list
                    loadAppraisals();

                    // If deleting the currently loaded appraisal, reset the form
                    if (currentAppraisal && currentAppraisal.id === appraisalId) {
                        resetForm();
                    }
                }
            });
        });
    }

    // Load and display appraisals in the browser modal
    async function loadAppraisals() {
        const appraisals = await fetchAppraisals();
        const searchTerm = appraisalSearch.value;
        const sortBy = sortBySelect.value;

        const filteredAndSorted = filterAndSortAppraisals(appraisals, searchTerm, sortBy);
        renderAppraisalsTable(filteredAndSorted);
    }

    // Function to load an appraisal for editing
    async function loadAppraisalForEditing(appraisalId) {
        const appraisal = await fetchAppraisalById(appraisalId);
        if (!appraisal) return;

        // Clear the current form but skip adding the default article
        // since we'll be adding the saved articles next
        resetForm(true);

        // Store the current appraisal
        currentAppraisal = appraisal;
        // Make it available in the global scope for print-fix.js
        window.currentAppraisal = appraisal;

        // Fill in the form fields
        for (const key in formElements) {
            if (formElements[key] && appraisal[key]) {
                formElements[key].value = appraisal[key];
            }
        }

        // Add articles
        if (appraisal.articles && Array.isArray(appraisal.articles)) {
            // If no articles, add at least one default article
            if (appraisal.articles.length === 0) {
                addArticle({ description: "Insert Description Here:", appraisedValue: "" }, false);
            } else {
                appraisal.articles.forEach(article => {
                    addArticle(article, false);
                });
            }
        } else {
            // If no articles array, add a default article
            addArticle({ description: "Insert Description Here:", appraisedValue: "" }, false);
        }

        // Show editing notice
        editingNotice.style.display = "block";
        currentAppraisalId.textContent = `${appraisal.clientName} (ID: ${appraisal.id})`;

        // Save form data to local storage
        saveFormData();

        // Recalculate total appraised value
        updateTotalAppraisedValue();
    }

    // Reset the form and clear editing state
    function resetForm(skipDefaultArticle = false) {
        // Clear form fields
        for (const key in formElements) {
            if (formElements[key]) {
                formElements[key].value = "";
            }
        }

        // Clear articles
        articlesContainer.innerHTML = "";

        // Clear current appraisal
        currentAppraisal = null;
        window.currentAppraisal = null;

        // Hide editing notice
        editingNotice.style.display = "none";
        currentAppraisalId.textContent = "";

        // Add a default article, unless skipped
        if (!skipDefaultArticle) {
            addArticle({ description: "Insert Description Here:", appraisedValue: "" }, true);
        }

        // Save empty form to local storage
        localStorage.clear();
        updateTotalAppraisedValue(); // Reset the total appraised value
    }

    // Open the appraisal browser modal
    function openAppraisalBrowser() {
        appraisalBrowserModal.style.display = "block";
        loadAppraisals();
    }

    // Close the appraisal browser modal
    function closeAppraisalBrowser() {
        appraisalBrowserModal.style.display = "none";
    }

    // Function to add a new article section
    function addArticle(articleData = { description: "", appraisedValue: "" }, shouldSave = true) {
        const articleId = `article-${Date.now()}`;
        const articleDiv = document.createElement("div");
        articleDiv.classList.add("article");
        articleDiv.id = articleId;

        // Description Form Group
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

        descriptionGroup.appendChild(descriptionLabel);
        descriptionGroup.appendChild(descriptionTextarea);
        articleDiv.appendChild(descriptionGroup);

        // Appraised Value Input
        const valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.id = `appraisedValue-${articleId}`;
        valueInput.name = `appraisedValue-${articleId}`;
        valueInput.value = articleData.appraisedValue || "";
        valueInput.placeholder = "$0.00";
        valueInput.classList.add("article-value-input");
        valueInput.addEventListener("input", () => {
            saveFormData(); // Save on edit
            updateTotalAppraisedValue(); // Recalculate total
        });

        articleDiv.appendChild(valueInput);

        // Remove Button
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.classList.add("removeArticleBtn");
        removeBtn.textContent = "Remove Article";
        removeBtn.addEventListener("click", () => {
            articleDiv.remove();
            saveFormData(); // Update local storage after removal
            updateTotalAppraisedValue(); // Recalculate total after removing article
        });

        articleDiv.appendChild(removeBtn);
        articlesContainer.appendChild(articleDiv);

        if (shouldSave) {
            saveFormData();
            updateTotalAppraisedValue(); // Calculate total after adding a new article
        }
    }

    addArticleBtn.addEventListener("click", () => addArticle());

    // Print functionality
    printBtn.addEventListener("click", () => {
        // Make sure all data attributes are updated before printing
        updateClientInfoAttributes();

        // Small delay to ensure all styles are applied
        setTimeout(() => {
            window.print();
        }, 100);
    });

    // Get appraisal data for saving and ensure data-attributes are updated
    function getAppraisalData() {
        // Make sure all data attributes are set before continuing
        updateClientInfoAttributes();

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
        return {
            ...formData,
            articles: articles,
            appraisedValue: totalAppraisedValue,
            generatedAt: new Date().toISOString()
        };
    }

    // Make it available in global scope for print-fix.js
    window.getAppraisalData = getAppraisalData;

    // Save appraisal to server
    async function saveAppraisalToServer(appraisalData) {
        try {
            // Check if we're updating an existing appraisal
            const isUpdate = currentAppraisal && currentAppraisal.id;
            const method = isUpdate ? 'PUT' : 'POST';
            const url = isUpdate ? `/api/appraisals/${currentAppraisal.id}` : '/api/appraisals';

            // If updating, keep the original ID and created timestamp
            if (isUpdate) {
                appraisalData.id = currentAppraisal.id;
                appraisalData.createdAt = currentAppraisal.createdAt;
                appraisalData.updatedAt = new Date().toISOString();
            }

            const apiHeaders = await getApiHeaders();
            if (!apiHeaders) {
                alert("Cannot save appraisal without a valid API Key.");
                throw new Error("API Key not provided");
            }

            const response = await fetch(url, {
                method: method,
                headers: apiHeaders, // Use the headers with API key
                body: JSON.stringify(appraisalData)
            });

            if (!response.ok) {
                if (response.status === 401) alert('Unauthorized: Invalid or missing API Key. Appraisal not saved.');
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save appraisal');
            }

            const result = await response.json();

            // Update current appraisal with the saved data if it was created
            if (!isUpdate && result && result.id) {
                currentAppraisal = {
                    id: result.id,
                    createdAt: result.createdAt,
                    ...appraisalData
                };

                // Update global window variable too
                window.currentAppraisal = currentAppraisal;

                // Show editing notice since we now have a saved appraisal
                editingNotice.style.display = "block";
                currentAppraisalId.textContent = `${appraisalData.clientName} (ID: ${result.id})`;
            }

            return result;
        } catch (error) {
            console.error('Error saving appraisal:', error);
            throw error;
        }
    }

    // Make it available in global scope for print-fix.js
    window.saveAppraisalToServer = saveAppraisalToServer;

    // Download functionality - only add event listener if button exists
    if (downloadBtn) {
        downloadBtn.addEventListener("click", async () => {
            // This will be handled by pdf-fix.js
            // The event will be passed along
        });
    }

    // Event listeners for the browser modal
    browseBtn.addEventListener("click", openAppraisalBrowser);
    closeModalBtn.addEventListener("click", closeAppraisalBrowser);

    // Close the modal if the user clicks outside of it
    window.addEventListener("click", (event) => {
        if (event.target === appraisalBrowserModal) {
            closeAppraisalBrowser();
        }
    });

    // Set up search and filter functionality
    appraisalSearch.addEventListener("input", () => {
        loadAppraisals();
    });

    sortBySelect.addEventListener("change", () => {
        loadAppraisals();
    });

    // Add a "New Appraisal" button to the modal
    const modalHeader = document.querySelector(".modal-header");
    const newAppraisalBtn = document.createElement("button");
    newAppraisalBtn.textContent = "New Appraisal";
    newAppraisalBtn.classList.add("new-appraisal-btn");
    newAppraisalBtn.addEventListener("click", () => {
        resetForm();
        closeAppraisalBrowser();
    });
    modalHeader.insertBefore(newAppraisalBtn, modalHeader.querySelector(".close-modal"));

    // Style for the new button
    const style = document.createElement("style");
    style.textContent = `
        .new-appraisal-btn {
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 0.9em;
            margin-right: auto;
        }
        .new-appraisal-btn:hover {
            background-color: #218838;
        }
        .modal-header {
            justify-content: flex-end;
        }
    `;
    document.head.appendChild(style);

    // Clear Form button with confirmation dialog
    clearFormBtn.addEventListener("click", () => {
        // Show confirmation dialog with warning
        const isConfirmed = confirm("WARNING: This will clear all form data and remove all information from your browser's local storage. This action cannot be undone. Are you sure you want to proceed?");

        if (isConfirmed) {
            // Clear local storage
            localStorage.clear();

            // Reset the form to empty state
            resetForm();

            // Show success message
            alert("Form has been cleared and local storage has been reset.");
        }
    });

    // Initial load
    loadFormData();
    // Add a default article if none exist
    if (articlesContainer.children.length === 0) {
        addArticle({ description: "Insert Description Here:", appraisedValue: "" }, true);
    }
    // Update data attributes for printing
    saveFormData();
    // Calculate initial total
    updateTotalAppraisedValue();
});