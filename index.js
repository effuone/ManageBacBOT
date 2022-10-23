import axios from "axios";
import "dotenv/config";
import cheerio from "cheerio";
import * as ManageBacService from './services/ManageBacService'
const originUrl = "https://isnur-sultan.managebac.com";

// TODO: add functionality for adding task details 
async function getDetailsFromTask(taskUrl) {
  const html = axios.get(taskUrl, {
    withCredentials: true,
    headers: {
      Cookie: myCookie,
    },
  }).data;
  const $ = cheerio.load(html);
  const texts = [];
  const detailsElememt = $(".fix-body-margins", html);
  if (detailsElememt.length > 0) {
    detailsElememt.find("p").each(function () {
      texts.push($(this).text());
    });
  }
  return texts;
}
