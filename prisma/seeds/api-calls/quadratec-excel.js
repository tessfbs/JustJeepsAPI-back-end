const XLSX = require('xlsx');

// Step 1: Load Excel file
const workbook = XLSX.readFile('pricingSheet_quad.xlsx');

// Step 2: Extract Sheet Data
const sheetName = workbook.SheetNames[0]; // assuming you want to read the first sheet
const sheet = workbook.Sheets[sheetName];

// Define custom header array
const customHeader = ["Quadratec PN", "MPN", "Description", "UPC Code", "Brand", "Retail Price", "Wholesale Price"];

const jsonData = XLSX.utils.sheet_to_json(sheet, { header: customHeader });

// Step 3: Access JSON Data
console.log(jsonData); // Log the JSON data to the console
