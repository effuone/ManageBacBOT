import cheerio from 'cheerio'
export default class ManageBacService {
    async getCourses(page){
        const html = await page.evaluate(() => document.querySelector('*').outerHTML);
        const $ = cheerio.load(html)
        const courses = []
        $('.parent', html).find('li').each(function(){
            const course = new Object();
            course.name = ($(this).find('span').text());
            course.link = originUrl + ($(this).find('a').attr('href'))
            courses.push(course)
        })
        return courses
    }
}