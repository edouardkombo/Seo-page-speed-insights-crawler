# Google Apps Script (SEO): Multi-URL & Multi-Language PageSpeed Insights Crawler

## Description

This **Google Apps Script** crawls multiple URLs across various languages for both desktop and mobile views and collects PageSpeed Insights metrics. The script can handle a large list of URLs, in different locales, and outputs the relevant PageSpeed performance scores and insights into a Google Sheet.

## Features

- **Multi-URL Crawling:** The script processes a list of URLs from a Google Sheet, which can contain different domains and subdomains.
- **Multi-Language Support:** The script supports crawling URLs in multiple languages, which can be specified in the input sheet.
- **Mobile & Desktop Crawling:** It gathers PageSpeed Insights data for both desktop and mobile platforms.
- **Performance Metrics:** It collects key metrics such as Performance Score, First Contentful Paint (FCP), Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Total Blocking Time (TBT).
- **Autonated retry of failed HTTP crawls:** If an URL failed at one point, the script can retry that fetch URL across the day, until it becomes successful.
- **Automated Reporting:** Outputs the PageSpeed metrics directly into a Google Sheet for easy analysis.

## Setup Instructions

1. **Create a New Google Sheet:**
   - Add a column for URLs (Column A) and another for Language (Column B).
   - Example structure:
     ```
     | Timestamp    | URL              | Url Name | Brand | Lang | Device  ...
     |--------------|------------------|----------|-------|------|---------
     | 2024-09-01...| https://x.com/en | Homepage | X     | en   | Desktop ...
     | 2024-09-01...| https://x.com/es | Homepage | X     | es   | Mobile  ...
     | 2024-09-01...| https://x.com/de | Homepage | X     | de   | Desktop ...
     ```
     ```
     ...PS | FCP | LCP | CLS | Interactive | TBT | Speed Index | Error |
     ...---|-----|-----|-----|-------------|-----|-------------|-------|
     ...?  | ?   | ?   | ?   | ?           | ?   | ?           | ?     |
     ...?  | ?   | ?   | ?   | ?           | ?   | ?           | ?     |
     ...?  | ?   | ?   | ?   | ?           | ?   | ?           | ?     |
     ```
2. **Get PageSpeed Insights API Key:**
   - Visit the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
   - Enable the **PageSpeed Insights API**.
   - Generate an API key and note it for later use.

3. **Add Google Apps Script:**
   - In your Google Sheet, navigate to `Extensions > Apps Script`.
   - Copy the provided code into the Apps Script editor.
   - Add your API key to the script.

4. **Run the Script:**
   - Execute the script by clicking the `Run` button.
   - The results (PageSpeed Insights metrics) will populate a new sheet within your Google Spreadsheet.

## Script Structure

### Input Sheet:

- **URLs:** A list of URLs to crawl.
- **Language:** The language code (e.g., `en`, `es`, `fr`, etc.) for each URL.

### Output:

- **Metrics collected:**
  - **Performance Score**
  - **Interactive**
  - **Speed Index**
  - **First Contentful Paint (FCP)**
  - **Largest Contentful Paint (LCP)**
  - **Cumulative Layout Shift (CLS)**
  - **Total Blocking Time (TBT)**
- Separate columns for **Desktop** and **Mobile** results.

### Script Flow:
1. **Crawl each URL** for one device (desktop or mobile) and one language (en, or pt, or ko...) at a time, using Google’s PageSpeed Insights API.
    - **If URL hasn't been crawled today** => Collect data and Populate results into the Google Sheet in corresponding rows, showing desktop and mobile metrics for each URL, even if URL fetch failed
    - **If URL has already been crawled today, but failed** => A separate method will be responsible to retry crawling 
    - **If URL has already been crawled today, failed, but is now successful** => We delete the failed crawl from Google Sheet  
2. **Script has 3 minutes exection time**, this is meant to prevent "execution timeout" error, in case of too many errors.
3. **Create two triggers for normal flow**, and call respectively the methods "crawlDesktop" and "crawlMobile" in each trigger. Each trigger will run for 3 minutes, and on next run, it will skip already crawled urls, to parse the new ones.
4. **Create two triggers to clean failed crawls**, and call respectively the methods "fixFailedDesktopCrawls" and "fixFailedMobileCrawls" in each trigger. Each trigger will attempt to crawl again failed URLs, and if successful, will delete the failed row, and populate new successful attempt into the Google Sheet.



## Code Example

```javascript
var pageSpeedApiKey = 'YOUR_API_KEY'; // use your api key here
var urlToMonitor = 'https://www.pinnacle.com'; //replace with website you want to monitor
var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
var sheet = spreadsheet.getSheetByName('Results'); //Name of your sheet
var scriptStartTime = new Date();
var maxExecutionTime = 180; //Local max execution time (in seconds)

//Function to check if time is up, so we can stop further script execution to prevent an error triggering
const isTimeUp = (startTime) => (new Date().getTime() - startTime.getTime())/1000 >= maxExecutionTime;

var data = {"brands": {
  "my_casino_brand": {
    "en": {
      "Casino homepage":"https://www.__brand__.com/__lang__/casino", 
      "Live casino homepage":"https://www.__brand__.com/__lang__/casino/live", 
      "Slots":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-slots", 
      "Tables":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table", 
      "Roulette":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table#casino-roulette"
    },
    "pt": {
      "Casino homepage":"https://www.__brand__.com/__lang__/casino", 
      "Live casino homepage":"https://www.__brand__.com/__lang__/casino/live", 
      "Slots":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-slots", 
      "Tables":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table", 
      "Roulette":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table#casino-roulette"
    },
    "ja": {
      "Casino homepage":"https://www.__brand__.com/__lang__/casino", 
      "Live casino homepage":"https://www.__brand__.com/__lang__/casino/live", 
      "Slots":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-slots", 
      "Tables":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table", 
      "Roulette":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table#casino-roulette"
    },
    "ko": {
      "Casino homepage":"https://www.__brand__.com/__lang__/casino", 
      "Live casino homepage":"https://www.__brand__.com/__lang__/casino/live", 
      "Slots":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-slots", 
      "Tables":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table", 
      "Roulette":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table#casino-roulette"
    },    
  }
}};

function runCrawler(counter=0, device="mobile") {
  let executionTime = Utilities.formatDate(new Date(), "GMT+1:00", "yyyy-MM-dd'T'HH:mm:ss");
  let brands = data["brands"];
  let crawledSuccessfulData = [];
  let crawledErrorData = [];

  for (let x=counter; x>=0; x--)
  {
    for (let brand in brands)
    {
      for (let lang in brands[brand])
      {
        for (let page in brands[brand][lang])
        {
          let url = brands[brand][lang][page].replace("__lang__",lang).replace("__brand__",brand);
          if (isTimeUp(scriptStartTime)==true)
          {
            console.log("Time is up! " + " - -" + new Date().getTime() + " - " + scriptStartTime.getTime() + " - " + ((new Date().getTime()-scriptStartTime.getTime())/1000));
            return false;
          }
          
          let brandNameFormatted = formatBrandName(brand);
          
          crawledSuccessfulData = alreadyCrawledToday(getDateBefore(x), brandNameFormatted, device, lang, url);
          crawledErrorData = alreadyCrawledToday(getDateBefore(x), brandNameFormatted, device, lang, url, false);

          //If a crawl has failed
          if (crawledErrorData[0]==true)
          {
            //Check if one was successful
            if (crawledSuccessfulData[0]==true && crawledSuccessfulData[1]=="")
            {
              //Then we delete crawls that have failed
              let deletion = retrieveAndDeleteCrawledErrors(getDateBefore(x), brandNameFormatted, device, lang, url);
              console.log("We delete that row - " + brandNameFormatted +"-"+ device +"-"+ lang +"-"+  url  + " -> " + deletion);
            }
          } 
          else
          {
            //If it's today's date
            if (x==0)
            {
              //No crawl in error for that row
              //If no crawl in success for that row today, we just crawl
              if(crawledSuccessfulData[0]==false)
              {
                allowDataToBeInserted(brand, lang, url, device, page, executionTime, true);
              }       
            }            
          }                  
        }
      }
    }
  }  
}

//...



