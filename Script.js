// Setup the scanner
const codeReader = new ZXing.BrowserMultiFormatReader();
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const resultDiv = document.getElementById('result');

startButton.addEventListener('click', () => {
  resultDiv.classList.add('hidden');
  startButton.style.display = 'none';
  
  // Start scanning using the device's back camera (if available)
  codeReader.decodeFromVideoDevice(null, 'video', (result, err) => {
    if (result) {
      // Barcode found! Stop the camera and process it.
      codeReader.reset();
      document.getElementById('video').srcObject = null;
      resetButton.style.display = 'inline-block';
      fetchProductData(result.text);
    }
  });
});

resetButton.addEventListener('click', () => {
  resultDiv.classList.add('hidden');
  resetButton.style.display = 'none';
  startButton.style.display = 'inline-block';
});

// Fetch data from Open Food Facts
async function fetchProductData(barcode) {
  try {
    document.getElementById('productName').innerText = `Looking up barcode: ${barcode}...`;
    resultDiv.classList.remove('hidden');

    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1) {
      const product = data.product;
      document.getElementById('productName').innerText = product.product_name || "Unknown Product";
      
      // Calculate score
      const healthData = calculateHealthScore(product.nutriments, product.ingredients_text);
      
      // Update the screen
      document.getElementById('healthRating').innerText = healthData.rating;
      document.getElementById('reasonsList').innerHTML = healthData.reasons.map(r => `<p>• ${r}</p>`).join('');
      
    } else {
      document.getElementById('productName').innerText = "Product not found in database.";
      document.getElementById('healthRating').innerText = "❌ Unknown";
      document.getElementById('reasonsList').innerHTML = "<p>We will add an image upload feature here later!</p>";
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    document.getElementById('productName').innerText = "Error connecting to database.";
  }
}

// Our scoring logic
function calculateHealthScore(nutriments, ingredientsText) {
  let score = 0;
  let reasons = [];

  const sugar = nutriments?.sugars_100g || 0;
  if (sugar > 20) { score -= 2; reasons.push(`High sugar: ${sugar}g`); }
  else if (sugar >= 10) { score -= 1; }
  else { score += 1; }

  const fat = nutriments?.fat_100g || 0;
  if (fat > 17) { score -= 2; reasons.push(`High fat: ${fat}g`); }
  else if (fat >= 5) { score -= 1; }
  else { score += 1; }

  const salt = nutriments?.salt_100g || 0;
  if (salt > 1.5) { score -= 2; reasons.push(`High salt: ${salt}g`); }
  else if (salt >= 0.5) { score -= 1; }
  else { score += 1; }

  let rating = "🟡 Moderate";
  if (score >= 2) rating = "🟢 Healthy";
  if (score <= -2) rating = "🔴 Unhealthy";

  if (reasons.length === 0) reasons.push("Good nutritional balance based on available data.");

  return { score, rating, reasons };
}

