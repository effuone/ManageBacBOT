import puppeteer from "puppeteer";
import cheerio from 'cheerio'
import 'dotenv/config'
import axios from "axios";

const originUrl = 'https://isnur-sultan.managebac.com'

async function main() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`${originUrl}/login`, { waitUntil: 'networkidle0' }); // wait until page load
    await page.type('#session_login', process.env.MANAGEBAC_EMAIL);
    await page.type('#session_password', process.env.MANAGEBAC_PASSWORD);
    await Promise.all([
        page.click('.btn-block'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    const cookies = await page.cookies()
    let cookieString = ''
    for (let i = 0; i < cookies.length; i++) {
      const element = cookies[i];
      cookieString += (element.name+element.value+'; ') 
    }
    const html = (await axios.get(`${originUrl}/student/tasks_and_deadlines`, {
      withCredentials:true,
      headers:{
          "Cookie": cookieString
      }
    })).data
    console.log(html)
    // const $ = cheerio.load(html)
    // $('.details', html).each(function(){
    //   const linkElement = $(this).find('.title')
    //   const taskName = linkElement.text()
    //   const link = originUrl + linkElement.find('a').attr('href')
    //   const subject = $(this).find('.group-name.a').attr('href')
    //   console.log({taskName, link, subject})
    // })
    // console.log(textData)
    // await page.screenshot({path: `./assets/images/managebac.png`})
    // console.log('New Page URL:', page.url());
    await browser.close();
  }
  
await main();
console.log('over')