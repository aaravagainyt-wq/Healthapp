    // Setup the scanner
    const codeReader = new ZXing.BrowserMultiFormatReader();
    const startButton = document.getElementById('startButton');
    const resetButton = document.getElementById('resetButton');
    const scannerView = document.getElementById('scanner-view');
    const resultDiv = document.getElementById('result');
    const statusMessage = document.getElementById('statusMessage');

    // Event listener for the main start button
    startButton.addEventListener('click', startScanner);

    // Event listener for the reset button (allows scanning another item)
    resetButton.addEventListener('click', resetScanner);

    // Our core scanner function
    function startScanner() {
      // Hide previous results and show camera viewfinder
      resultDiv.classList.add('hidden');
      statusMessage.classList.add('hidden'); // Clear previous messages
      startButton.classList.add('hidden'); // Hide start button
      scannerView.classList.add('active'); // Activate visual state

      // Start scanning using the device's back camera (or default)
      codeReader.decodeFromVideoDevice(null, 'video', (result, err) => {
        // This callback runs continuously while scanning.

        if (result) {
          // Barcode successfully found and decoded!
          console.log('Barcode detected:', result.text);
          
          // Stop the camera view and decoding immediately to save resources
          codeReader.reset();
          document.getElementById('video').srcObject = null;
          scannerView.classList.remove('active'); // Deactivate visual state

          // Show the 'Scan Another' button and fetch product details
          resetButton.classList.remove('hidden');
          fetchProductData(result.text);
        }
        
        // Check for errors (only specific scanning errors, permissions handled below)
        if (err && !(err instanceof ZXing.NotFoundException)) {
          console.error('Decoding error:', err);
        }
      });

      // Handle generic errors (like permission denied) immediately.
      codeReader.listVideoInputDevices()
        .catch(error => {
          // This is often permission related.
          console.error('Camera initialization failed:', error);
          scannerView.classList.remove('active'); // Hide viewfinder
          startButton.classList.remove('hidden'); // Show button again
          
          statusMessage.innerText = 'Unable to access camera. Please check your browser permissions (Lock icon near URL).';
          statusMessage.classList.remove('hidden');
        });
    }

    // Function to handle the reset and ready the UI for a new scan
    function resetScanner() {
      resultDiv.classList.add('hidden');
      resetButton.classList.add('hidden');
      startButton.classList.remove('hidden');
    }

    // Function to fetch data from Open Food Facts API
    async function fetchProductData(barcode) {
      try {
        // Show user feedback
        document.getElementById('productName').innerText = `Looking up barcode: ${barcode}...`;
        resultDiv.classList.remove('hidden');

        const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 1) {
          // Product found!
          const product = data.product;
          document.getElementById('productName').innerText = product.product_name || "Unknown Product";
          
          // Calculate health score using our scoring function
          const healthData = calculateHealthScore(product.nutriments, product.ingredients_text);
          
          // Update the screen with the rating and reasons
          document.getElementById('healthRating').innerText = healthData.rating;
          document.getElementById('reasonsList').innerHTML = healthData.reasons.map(r => `<p>• ${r}</p>`).join('');
          
        } else {
          // Product not found in database.
          document.getElementById('productName').innerText = "Product not found in database.";
          document.getElementById('healthRating').innerText = "❌ Unknown";
          document.getElementById('reasonsList').innerHTML = "<p>Fallback image upload coming soon!</p>";
        }
      } catch (error) {
        // Network or API connection error.
        console.error("Error fetching data:", error);
        document.getElementById('productName').innerText = "Error connecting to database.";
      }
    }

    // Our scoring logic based on the prompt's rule system
    function calculateHealthScore(nutriments, ingredientsText) {
      let score = 0;
      let reasons = [];

      // 1. Sugar Rules
      const sugar = nutriments?.sugars_100g || 0;
      if (sugar > 20) { score -= 2; reasons.push(`High sugar: ${sugar}g`); }
      else if (sugar >= 10) { score -= 1; }
      else { score += 1; }

      // 2. Fat Rules
      const fat = nutriments?.fat_100g || 0;
      if (fat > 17) { score -= 2; reasons.push(`High fat: ${fat}g`); }
      else if (fat >= 5) { score -= 1; }
      else { score += 1; }

      // 3. Salt Rules
      const salt = nutriments?.salt_100g || 0;
      if (salt > 1.5) { score -= 2; reasons.push(`High salt: ${salt}g`); }
      else if (salt >= 0.5) { score -= 1; }
      else { score += 1; }

      // 4. Additives (E-Numbers, optional extension logic could go here)

      // 5. Determine Final Rating
      let rating = "🟡 Moderate";
      if (score >= 2) rating = "🟢 Healthy";
      if (score <= -2) rating = "🔴 Unhealthy";

      // If no "bad" specific traits triggered, provide a basic healthy summary
      if (reasons.length === 0) reasons.push("Good nutritional balance.");

      return { score, rating, reasons };
    }
    // --- NEW IMAGE UPLOAD LOGIC ---
    const uploadBtn = document.getElementById('uploadBtn');
    const imageUpload = document.getElementById('imageUpload');

    // 1. When the gold "Upload Picture" button is clicked, trigger the hidden file input
    uploadBtn.addEventListener('click', () => {
      imageUpload.click();
    });

    // 2. When a picture is selected from the camera or gallery
    imageUpload.addEventListener('change', (event) => {
      const file = event.target.files[0];
      
      if (file) {
        console.log("Picture selected:", file.name);
        
        // Hide the scanner stuff and show a status message
        scannerView.classList.remove('active');
        resultDiv.classList.add('hidden');
        
        // Let the user know it worked
        statusMessage.innerText = `Awesome! Image loaded: ${file.name}.`;
        statusMessage.classList.remove('hidden');
        
        // We will add the AI / OCR reading magic here next!
      }
    });
