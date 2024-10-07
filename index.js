const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const bodyParser = require('body-parser');


puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/scrape', async (req, res) => {
  const { websites, selectors } = req.body;
  if (!websites || !Array.isArray(websites) || websites.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of websites to scrape.' });
  }
  if (!selectors || !Array.isArray(selectors) || selectors.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of selectors to scrape.' });
  }
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920x1080'],
  });

  const page = await browser.newPage();

  let results = [];

  for (let site of websites) {
    try {

      await page.goto(site, { waitUntil: 'networkidle2', timeout: 120000 });

      const data = await page.evaluate((selectors) => {
        let items = [];

        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(item => {
            items.push({
              text: item.innerText.trim(),
              url: item.querySelector('a')?.href || '',
            });
          });
        });

        return items;
      }, selectors);


      results = results.concat(data);
    } catch (error) {

      console.error(`Error scraping ${site}: ${error.message}`);
      results.push({ error: `Failed to scrape ${site}: ${error.message}` });
    }
  }

  await browser.close();
  res.json(results);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
});
