const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'https://*.herokuapp.com'],
  credentials: true
}));

async function logSidebarSamenvattingContent(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url);

  await page.waitForSelector('[data-testid="samenvatting"]', { timeout: 20000 });

  page.on('console', msg => {
    console.log(msg.text());
  });

  function getObjectIdFromUrl(url) {
    try {
      const urlObject = new URL(url);
      const params = new URLSearchParams(urlObject.search);
      return params.get('objectId') || null;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  }

  const contentObject = await page.evaluate(() => {        
    const parentElement = document.querySelector('[data-testid="samenvatting"]');
    if (!parentElement || !parentElement.children.length >= 2) return [];
    
    const secondChild = parentElement.children[1];
    if (!secondChild) return [];

    const elements = Array.from(secondChild.children[0].children);

    const keysArray = [];
    const valuesArray = [];
  
    keysArray.push('BagID');
    valuesArray.push(document.location.search.match(/objectId=([^&]+)/)[1]);

    keysArray.push(elements[0].querySelector('h3').textContent.trim());
    keysArray.push('Postcode')
    keysArray.push('Woonplaats')

    const addressPostalCode = elements[0].querySelector('p').innerHTML.trim();

    const brIndex = addressPostalCode.indexOf('<br');
    const closingBracketIndex = addressPostalCode.indexOf('>', brIndex);

    const address = addressPostalCode.slice(0, brIndex);
    const postalCodeTown = addressPostalCode.slice(closingBracketIndex + 1);
    const postalCode = postalCodeTown.split(' ').slice(0, -1).join('');
    const town = postalCodeTown.split(' ').pop()

    valuesArray.push(address.trim());
    valuesArray.push(postalCode.trim());
    valuesArray.push(town.trim());

    for (i = 1; i < elements.length; i++) {
      keysArray.push(elements[i].querySelector('h3').textContent.trim());

      const valueElement = elements[i].querySelector(':is(li, p)');

      if (valueElement) {
        valuesArray.push(valueElement.textContent.trim());
      } else {
        console.warn(`No matching element found for index ${i}`);
      }
    }

    console.log(keysArray);
    console.log(valuesArray);
    return { keys: keysArray, values: valuesArray, content: elements.map(el => el.textContent.trim()) };
  });

  await browser.close();
  
  console.log(contentObject.keys);
  console.log(contentObject.values)

  return contentObject;
}

app.get('/', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url) {
      // If no URL is provided, send back a simple HTML page with instructions
      let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Enter a URL</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 100%; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            input[type="text"], button { margin-top: 20px; }
            #resultContainer { border: 1px solid #ccc; padding: 20px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Please Enter a URL</h1>
          <form action="/" method="GET">
            <input type="text" name="url" placeholder="Enter URL here" required>
            <button type="submit">Submit</button>
          </form>
          <div id="resultContainer"></div>
          <script>
            document.addEventListener('DOMContentLoaded', () => {
              const form = document.querySelector('form');
              form.addEventListener('submit', (e) => {
                e.preventDefault();
                const urlInput = document.querySelector('input[name="url"]');
                const resultContainer = document.getElementById('resultContainer');
                
                fetch(form.action + '?' + new URLSearchParams({url: urlInput.value}).toString())
                  .then(response => response.text())
                  .then(html => {
                    resultContainer.innerHTML = html;
                  })
                  .catch(error => console.error('Error:', error));
              });
            });
          </script>
        </body>
      </html>
      `;
      res.send(html);
    } else {
      // If a URL is provided, proceed with scraping
      const contentObject = await logSidebarSamenvattingContent(decodeURIComponent(url));
      
      function createTableHtml(contentObject, headers) {
        let tableHtml = '<table id="contentTable">';
        if (headers) {
          tableHtml += '<tr>';
          contentObject.keys.forEach((key, index) => {
            tableHtml += '<th>' + key + '</th>';
          });
          tableHtml += '</tr>';
        } 
        tableHtml += '<tr>';
        contentObject.values.forEach((value, index) => {
          tableHtml += '<td>' + value + '</td>';
        });
        tableHtml += '</tr>';
        return tableHtml;
      }

      let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Scraped Content</title>
          <style>
            #contentTable {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            #contentTable th, #contentTable td {
              border: 1px solid black;
              padding: 8px;
              text-align: left;
            }
            #contentTable tr:nth-child(even) {
              background-color: #f2f2f2;
            }
          </style>
        </head>
        <body>
          <h1>Scraped Content from ${contentObject.values[0]}</h1>
          <div>${createTableHtml(contentObject, true)}</div>
          <h2>With Headers</h2>
          <textarea id="contentTextarea" rows="10" cols="50">${createTableHtml(contentObject, true)}</textarea>
          <h2>Without Headers</h2>
          <textarea id="contentTextarea" rows="10" cols="50">${createTableHtml(contentObject, false)}</textarea>
          <script>
            document.addEventListener('DOMContentLoaded', () => {
              const textarea = document.getElementById('contentTextarea');
              const contentTable = document.getElementById('contentTable');

              function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(
                  function() {
                    console.log('Copied to clipboard successfully');
                  },
                  function(err) {
                    console.error('Could not copy text: ', err);
                  }
                );
              }

              textarea.addEventListener('click', () => {
                copyToClipboard(textarea.value);
              });
            });
          </script>
        </body>
      </html>
      `;
      
      res.send(html);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar samenvatting content' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});