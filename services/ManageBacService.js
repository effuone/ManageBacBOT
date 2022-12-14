import puppeteer from "puppeteer";
import cheerio from "cheerio";
import axios from 'axios'
const originUrl = "https://isnur-sultan.managebac.com";
  export const getCourses = async (cookie) => {
    const html = (await axios.get(originUrl+'/student/profile', {
      withCredentials: true,
      headers: {
        "Cookie": cookie
      }
    })).data
    const courses = [];
    const $ = cheerio.load(html)
    $(".parent", html)
      .find("li")
      .each(function () {
        const course = new Object();
        course.name = $(this).find("span").text();
        course.link = originUrl + $(this).find("a").attr("href");
        if(course.name.length!==0)
          courses.push(course);
      });
    return courses;
  }
  export const getCourseGrade = async (courseUrl, cookie) => {
    const html = (await axios.get(courseUrl+'/units', {
      withCredentials: true,
      headers: {
        "Cookie": cookie,
        "User-Agent": 'PostmanRuntime/7.29.2'
      }
    })).data
    const $ = cheerio.load(html)
    const overallElement = ($('.list-item').eq(1).text())
    const start = overallElement.indexOf('(') + 1
    const end = overallElement.indexOf(')') - 1
    const grade = parseFloat(overallElement.substring(start, end))
    return grade;
  }
  export const getCourseGrades = async (cookie) => {
    const courses = await getCourses(cookie);
    for (let i = 0; i < courses.length; i++) {
      courses[i].grade = await getCourseGrade(courses[i].link, cookie);
    }
    return courses;
  }
  export const getServiceCookies = async (email, password) => {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.goto(`${originUrl}/login`, { waitUntil: "networkidle0" }); // wait until page load
    await page.type("#session_login", email);
    await page.type("#session_password", password);
    await Promise.all([
      page.click(".btn-block"),
      page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);
    const data = await page.evaluate(() => document.querySelector('*').outerHTML);
    if(data.indexOf('Error.')>0)
    {
      return false;
    }
    const cookies = await page.cookies();
    await browser.close();
    // console.log(cookies)
    const extractedCookies = [];
    extractedCookies.push(
      (({ name, value }) => ({ name, value }))(
        cookies.find((item) => item.name === "__utma")
      )
    );
    extractedCookies.push(
      (({ name, value }) => ({ name, value }))(
        cookies.find((item) => item.name === "__utmc")
      )
    );
    extractedCookies.push(
      (({ name, value }) => ({ name, value }))(
        cookies.find((item) => item.name === "__utmz")
      )
    );
    extractedCookies.push(
      (({ name, value }) => ({ name, value }))(
        cookies.find((item) => item.name === "user_id")
      )
    );
    extractedCookies.push(
      (({ name, value }) => ({ name, value }))(
        cookies.find((item) => item.name === "user")
      )
    );
    extractedCookies.push(
      (({ name, value }) => ({ name, value }))(
        cookies.find((item) => item.name === "_managebac_session")
      )
    );
    let cookieString = "";
    for (let i = 0; i < extractedCookies.length; i++) {
      const element = extractedCookies[i];
      cookieString += element.name + "=" + element.value + "; ";
    }
    return cookieString;
  }
  export const getUpcomingTasks = async (cookie) => {
    const html = (await axios.get(originUrl + '/student/tasks_and_deadlines', {
      withCredentials: true,
      headers: {
        "Cookie": cookie
      }
    })).data
    const $ = cheerio.load(html)
    
    const tasks = []
    $('.details', html).each(function(){
      const task = new Object();
      const taskElement = $(this).find('.title')
      task.subject = $(this).find('.group-name').text().trim()
      task.title = taskElement.text().trim()
      task.taskType = ''
      $(this).find('.label').each(function(){
        task.taskType += ($(this).text().trim() + ' ')
      })
      task.dueDate = $(this).find('.due').text().trim()
      task.url = originUrl + taskElement.find('a').attr('href')
      tasks.push(task)
    })
    return tasks
}