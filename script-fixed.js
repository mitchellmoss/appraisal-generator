document.addEventListener("DOMContentLoaded", () => {
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
            articles.push({ description: articleText });
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

            const response = await fetch('/api/appraisals');
            if (!response.ok) {
                throw new Error('Failed to fetch appraisals');
            }

            const appraisals = await response.json();
            return appraisals;
        } catch (error) {
            console.error('Error fetching appraisals:', error);
            return [];
        } finally {
            appraisalLoadingMessage.style.display = "none";
        }
    }

    // Fetch a specific appraisal by ID
    async function fetchAppraisalById(id) {
        try {
            const response = await fetch(`/api/appraisals/${id}`);
            if (!response.ok) {
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

            const response = await fetch(`/api/appraisals/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
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
                        if (!str) return 0;
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

            row.innerHTML = `
                <td>${appraisal.clientName || 'Unnamed Client'}</td>
                <td>${formattedDate}</td>
                <td>${appraisal.appraisedValue || 'Not specified'}</td>
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

        // Clear the current form
        resetForm();

        // Store the current appraisal
        currentAppraisal = appraisal;

        // Fill in the form fields
        for (const key in formElements) {
            if (formElements[key] && appraisal[key]) {
                formElements[key].value = appraisal[key];
            }
        }

        // Add articles
        if (appraisal.articles && Array.isArray(appraisal.articles)) {
            appraisal.articles.forEach(article => {
                addArticle(article, false);
            });
        }

        // Show editing notice
        editingNotice.style.display = "block";
        currentAppraisalId.textContent = `${appraisal.clientName} (ID: ${appraisal.id.substring(0, 8)}...)`;

        // Save form data to local storage
        saveFormData();
    }

    // Reset the form and clear editing state
    function resetForm() {
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

        // Hide editing notice
        editingNotice.style.display = "none";
        currentAppraisalId.textContent = "";

        // Add a default article
        addArticle({ description: "Insert Description Here:" }, true);

        // Save empty form to local storage
        localStorage.clear();
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

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appraisalData)
            });

            if (!response.ok) {
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

                // Show editing notice since we now have a saved appraisal
                editingNotice.style.display = "block";
                currentAppraisalId.textContent = `${appraisalData.clientName} (ID: ${result.id.substring(0, 8)}...)`;
            }

            return result;
        } catch (error) {
            console.error('Error saving appraisal:', error);
            throw error;
        }
    }

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
        addArticle({ description: "Insert Description Here:" }, true);
    }
    // Update data attributes for printing
    saveFormData();
});