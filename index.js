const puppeteer = require("puppeteer");
const { parseISO, compareAsc, isBefore, format } = require("date-fns");
require("dotenv").config();

const { delay, sendEmail, logStep } = require("./utils");
const {
  siteInfo,
  loginCred,
  IS_PROD,
  NEXT_SCHEDULE_POLL,
  NEXT_TRY,
  MAX_NUMBER_OF_POLL,
  NOTIFY_ON_DATE_BEFORE,
} = require("./config");

let isLoggedIn = false;
let maxTries = MAX_NUMBER_OF_POLL;

const login = async (page) => {
  logStep("logging in");
  await page.goto(siteInfo.LOGIN_URL);

  const form = await page.$("form#sign_in_form");

  const email = await form.$('input[name="user[email]"]');
  const password = await form.$('input[name="user[password]"]');
  const privacyTerms = await form.$('input[name="policy_confirmed"]');
  const signInButton = await form.$('input[name="commit"]');

  await email.type(loginCred.EMAIL);
  await password.type(loginCred.PASSWORD);
  await privacyTerms.click();
  await signInButton.click();

  await page.waitForNavigation();

  return true;
};

const notifyMe = async (earliestDate, facility) => {
  const formattedDate = format(earliestDate, "dd-MM-yyyy");
  logStep(`sending an email to schedule for ${formattedDate}`);
  await sendEmail({
    subject: `We found an earlier date ${formattedDate} in ${facility}`,
    text: `Hurry and schedule for ${formattedDate} before it is taken.`,
  });
};

const checkForSchedules = async (page, facility) => {
  logStep(`checking for schedules ${facility.name}`);
  await page.goto(buildReq(facility.id));

  const originalPageContent = await page.content();
  const bodyText = await page.evaluate(() => {
    return document.querySelector("body").innerText;
  });

  try {
    console.log(bodyText);
    const parsedBody = JSON.parse(bodyText);

    if (!Array.isArray(parsedBody)) {
      throw "Failed to parse dates, probably because you are not logged in";
    }

    const dates = parsedBody.map((item) => parseISO(item.date));
    const [earliest] = dates.sort(compareAsc);

    return earliest;
  } catch (err) {
    console.log("Unable to parse page JSON content", originalPageContent);
    console.error(err);
    isLoggedIn = false;
  }
};

const process = async (browser) => {
  logStep(`starting process with ${maxTries} tries left`);

  if (maxTries-- <= 0) {
    console.log("Reached Max tries");
    return;
  }

  const page = await browser.newPage();

  if(!isLoggedIn) {
     isLoggedIn = await login(page);
  }
  
  for await(const facility of getFacilities()){
    const earliestDate = await checkForSchedules(page, facility);
    if (
      earliestDate &&
      isBefore(earliestDate, parseISO(NOTIFY_ON_DATE_BEFORE))
    ) {
      await notifyMe(earliestDate, facility.name);
    }
    let waitTime = Math.floor(getRandomArbitrary(1,NEXT_SCHEDULE_POLL)*1000);
    
    console.log(`Waiting for :${waitTime/1000}sec`)
    await delay(waitTime);
  }

    console.log(`Waiting for :${NEXT_TRY}sec`)
    await delay(NEXT_TRY*1000);
    await process(browser);
  
};

const getFacilities = () => {
  return siteInfo.FACILITIES.split(",").map((item) => {
    return { id: item.split("-")[0], name: item.split("-")[1] };
  });
};

const getRandomArbitrary = (min, max) =>{
  return Math.random() * (max - min) + min;
}


const buildReq = (id) => {
  return `https://ais.usvisa-info.com/${siteInfo.COUNTRY_CODE}/niv/schedule/${siteInfo.SCHEDULE_ID}/appointment/days/${id}.json?appointments%5Bexpedite%5D=false`;
};

(async () => {
  const browser = await puppeteer.launch(
    !IS_PROD ? { headless: false } : undefined
  );

  try {
    await process(browser);
  } catch (err) {
    console.error(err);
  }

  await browser.close();
})();
