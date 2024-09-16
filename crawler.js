var pageSpeedApiKey = 'YOUR_API_KEY'; // use your api key here
var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
var sheet = spreadsheet.getSheetByName('Results');
var scriptStartTime = new Date();
var maxExecutionTime = 180; //Local max execution time (in seconds)

//Function to check if time is up, so we can stop further script execution to prevent an error triggering
const isTimeUp = (startTime) => (new Date().getTime() - startTime.getTime())/1000 >= maxExecutionTime;

var data = {"brands": {
  "my_beautiful_brand": {
    "en": {
      "Homepage":"https://www.__brand__.com/__lang__/casino", 
      "Live Casino HP":"https://www.__brand__.com/__lang__/casino/live", 
      "Slots Url":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-slots", 
      "Table Games":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table", 
      "Roulette":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table#casino-roulette" 
    },
    "pt": {
      "Homepage":"https://www.__brand__.com/__lang__/casino", 
      "Live Casino HP":"https://www.__brand__.com/__lang__/casino/live", 
      "Slots Url":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-slots", 
      "Table Games":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table", 
      "Roulette":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table#casino-roulette"
    },
    "ja": {
      "Homepage":"https://www.__brand__.com/__lang__/casino", 
      "Live Casino HP":"https://www.__brand__.com/__lang__/casino/live", 
      "Slots Url":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-slots", 
      "Table Games":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table", 
      "Roulette":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table#casino-roulette"
    },
    "ko": {
      "Homepage":"https://www.__brand__.com/__lang__/casino", 
      "Live Casino HP":"https://www.__brand__.com/__lang__/casino/live", 
      "Slots Url":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-slots", 
      "Table Games":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table", 
      "Roulette":"https://www.__brand__.com/__lang__/casino/games/favourite/casino-table#casino-roulette"
    }    
  },  
}};

function getTodayDate () {
  let today = new Date()
  let month = today.getMonth()+1; //months from 0-11
  month = (month<10) ? month.replace("0","") : month;
  let day = today.getDate();
  day = (day<10) ? day.replace("0","") : day;
  let year = today.getFullYear();
  let todayDate = year + "-" + month + "-" + day;

  return todayDate;
}

function getFormattedSheetDate(sheetDate)
{
  let monthAssoc = {"Jan":"1","Feb":"2","Mar":"3","Apr":"4","May":"5","Jun":"6","Jul":"7","Aug":"8","Sep":"9","Oct":"10","Nov":"11","Dec":"12"};
  
  for (let month in monthAssoc)
  {
    let monthInLetters = sheetDate.substring(0,3);
    if (month==monthInLetters)
    {
      sheetDate = sheetDate.replace(monthInLetters, monthAssoc[month]);  
    }
  }

  return sheetDate.substring(5,9) + "-" + sheetDate.substring(0,1) + "-" + sheetDate.substring(2,4);  
}

function getDateBefore(counter=1)
{
  let currentDate = Utilities.formatDate(new Date(), "GMT+1:00", "yyyy-MM-dd'T'HH:mm:ss");
  let yesterday = parseInt(currentDate.substring(8,10))-counter;
  let lastMonth = parseInt(currentDate.substring(5,7))-1;
  let currentMonth = currentDate.substring(5,7);
  currentMonth = (currentMonth<10) ? currentMonth.toString().replace("0","") : currentMonth.toString();
  let monthDay = ""; 

  if (yesterday==0)
  {
    if (lastMonth==1)
    {
      lastMonth = 12;
      lastMonth = (lastMonth<10) ? lastMonth.toString().replace("0","") : lastMonth.toString();
    }    
    yesterday = 31;
    yesterday = (yesterday<10) ? yesterday.toString().replace("0","") : yesterday.toString();
    lastMonth = (lastMonth<10) ? lastMonth.toString().replace("0","") : lastMonth.toString();
    monthDay = lastMonth + "-" + yesterday;
  }
  else if (yesterday>0 && yesterday<10)
  {
    yesterday = (yesterday<10) ? yesterday.toString().replace("0","") : yesterday.toString();
  }

  monthDay = currentMonth + "-" + yesterday; 
  return currentDate.substring(0,5) + monthDay;
}

function formatBrandName(brand)
{
  return brand[0].toUpperCase() + brand.slice(1);
}

//Check in the excel document if a row has already been crawled today, and return error status of the crawl
function alreadyCrawledToday(todayDate=getTodayDate(), brand="Draftkings", device="mobile", lang="en", url="https://sportsbook.draftkings.com/", success=true) 
{
  let today = todayDate;
  let theValues = sheet.getRange("A:N").getValues();
  let brandValues = theValues.filter(x => x[3]==brand && x[5]==device && x[4]==lang && x[1]==url);
  let hasValueToday = false;
  let crawlStatus = "";

  for( let i=brandValues.length-1; i>=0; i--) 
  {
    let sheetDate = brandValues[i][0].toString().substring(4, 15).replaceAll(" ","-");
    let newSheetDate = getFormattedSheetDate(sheetDate);

    //console.log(newSheetDate + " => " + today + " || " + brandValues[0][5] + " => " + device);
    if (newSheetDate==today)
    {
      crawlStatus = brandValues[i][13].toString();
      crawlStatus = (crawlStatus==true || crawlStatus=="TRUE" || crawlStatus=="true"|| crawlStatus=="1") ? "true" : "";

      if ((success==true && crawlStatus=="") || (success==false && crawlStatus=="true"))
      {
        hasValueToday = true;
        break;
      }     
    }
  }

  return hasValueToday==true ? [hasValueToday,crawlStatus] : [hasValueToday,'none'];  
}

function retrieveAndDeleteCrawledErrors(todayDate=getTodayDate(), brand="Draftkings", device="mobile", lang="en", url="https://sportsbook.draftkings.com/") 
{
  let today = todayDate;
  let theValues = sheet.getRange("A:N").getValues();
  let brandValues = theValues.filter(x => x[3]==brand && x[5]==device && x[4]==lang && x[1]==url && x[13]==true);
  let deletedRow = false;

  if (brandValues.length==0)
  {
    console.log("NO ROW FOUND FOR | SO CAN'T DELETE => " + today + " : " + brand + " : " + device + " : " + lang + " : " + url );
    return false;
  }

  for( let i=brandValues.length-1; i>=0; i--) 
  {
    let sheetDate = brandValues[i][0].toString().substring(4, 15).replaceAll(" ","-");
    let newSheetDate = getFormattedSheetDate(sheetDate);

    if (newSheetDate==today)
    {
      deletedRow = findAndDeleteCell(brand, device, lang, url, "true", brandValues[i][0]);
      //console.log(deletedRow + " - " + today + " - Deleted " + brand + " : " + device + " : " + lang + " : " + url );
    }
  }

  return deletedRow;  
}

function findAndDeleteCell(brand, device, lang, url, crawlError, date) 
{
  let dataRange = sheet.getDataRange();
  let values = dataRange.getValues();

  for (let i = 0; i < values.length; i++) {
    let row = i+1;
    for (let j = 0; j < values[i].length; j++) {   
      if (values[i][0].toString()==date.toString() && values[i][3]==brand && values[i][5]==device && values[i][4]==lang && values[i][1]==url && values[i][13].toString()==crawlError) 
      {
        sheet.deleteRow(row);
        return true;
      }
    }    
  } 

  return false; 
}

function createHeaders() {
  //Freezes the first row
  sheet.setFrozenRows(1);
  // Set the values we want for headers
  var values = [["Timestamp", "Url", "Url Name", "Brand", "Lang", "Device","Performance Score", "FCP", "LCP", "CLS", "Interactive", "TBTime", "Speed Index", "Error"]];
  // Set the range of cells
  var range = sheet.getRange(1, 1, 1, 14);
  //Call the setValues method on range and pass in our values
  range.setValues(values);
}

function crawlDesktop() {
  runCrawler(0, "desktop");
}

function crawlMobile() {
  runCrawler(0, "mobile");
}

function fixFailedDesktopCrawls() {
  fixCrawlInErrors(0, "desktop");
}

function fixFailedMobileCrawls() {
  fixCrawlInErrors(0, "mobile");
}

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

function fixCrawlInErrors(counter=0, device="mobile") {
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
            else if (crawledSuccessfulData[0]==false)
            {
              //At least one crawl was unsuccessful, and no successful crawl has been found
              //We insert data, if it's today's date
              if (x==0)
              {
                allowDataToBeInserted(brand, lang, url, device, page, executionTime);        
              }
            }
          }                   
        }
      }
    }
  }  
}

function allowDataToBeInserted(brand, lang, url, device, page, executionTime, force=false)
{
  console.log("Getting device info for : " + brand + " - " + lang + " - " + device + " - " + page);
  let deviceInfo = getPageSpeedInfo(url, device);

  //If this new crawl failed, because last one already failed, we do nothing
  if (deviceInfo=="false")
  {
    console.log("New crawl failed again for: " +  brand + " - " + lang + " - " + device + " - " + page);
    if (force==true)
    {
      instertDataToSheet(url, page, brand, lang, deviceInfo, device, executionTime, 'true');
    }
  }
  else
  {
    console.log("We insert data - " + url +"-"+ page +"-"+ brand +"-"+ lang +"-"+ deviceInfo +"-"+ device);
    instertDataToSheet(url, page, brand, lang, deviceInfo, device, executionTime, '');
  }
}

function getPageSpeedInfo(current_url, strategy) {
  let pageSpeedUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + current_url + '&key=' + pageSpeedApiKey + '&strategy=' + strategy;

  try {
    let response = UrlFetchApp.fetch(pageSpeedUrl);

    if(response.getResponseCode() == 200) {
        let json = response.getContentText();
        return JSON.parse(json);
    }
  } catch (err) {
      // handle the error here
      Logger.log('Error: ' + err);
      return "false";
  }
}

function instertDataToSheet(url, urlName, brand, lang, deviceInfo, deviceType, executionTime, fetchError){
  sheet.appendRow([
    executionTime,
    url,
    urlName,
    formatBrandName(brand),
    lang,
    deviceType,
    (fetchError=="true") ? "0" : deviceInfo.lighthouseResult.categories.performance.score * 100,
    //deviceInfo.lighthouseResult.audits['max-potential-fid'].numericValue,        
    (fetchError=="true") ? "0" : deviceInfo.lighthouseResult.audits['first-contentful-paint'].numericValue,
    (fetchError=="true") ? "0" : deviceInfo.lighthouseResult.audits['largest-contentful-paint'].numericValue,
    (fetchError=="true") ? "0" : deviceInfo.lighthouseResult.audits['cumulative-layout-shift'].numericValue,
    (fetchError=="true") ? "0" : deviceInfo.lighthouseResult.audits['interactive'].numericValue,
    (fetchError=="true") ? "0" : deviceInfo.lighthouseResult.audits['total-blocking-time'].numericValue,
    (fetchError=="true") ? "0" : deviceInfo.lighthouseResult.audits['speed-index'].numericValue,
    fetchError
  ]);
}
