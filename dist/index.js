import express from "express";
import _ from "lodash";
import fetch from "node-fetch";
const app = express();
const port = process.env.PORT || 3000;
const getData = async () => {
    const res = await fetch("https://intent-kit-16.hasura.app/api/rest/blogs", {
        headers: {
            "x-hasura-admin-secret": "32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6",
        },
    });
    const data = await res.json();
    return data;
};
const getAnalytics = async (data) => {
    if (data) {
        if (Object.keys(data).length > 0) {
            const fetched_blog_count = _.size(data.blogs); //count no. of blogs
            const groupedBlogsByTitleLength = _.groupBy(data.blogs, "title.length"); //grouping blogs by title length
            const blogWithLongestTitle = _.findLast(groupedBlogsByTitleLength); //getting blog with longest title
            let privacy_count = 0;
            //Looping data to search for titles with word privacy
            _.filter(data.blogs, function (o) {
                if (o.title.toLowerCase().indexOf("privacy") != -1)
                    //checking if title contains privacy
                    privacy_count++;
            });
            const unique_blogs = _.uniqBy(data.blogs, "title"); //making data unique
            const unique_blogs_title = [];
            _.each(unique_blogs, (values, key) => {
                unique_blogs_title.push(values["title"]); //array of only titles
            });
            // console.log(fetched_blog_count);
            // console.log(_.findIndex(data.blogs,["id",_.findLast(groupedBlogsByTitleLength)[0].id]));
            // console.log(privacy_count);
            // console.log(unique_blogs_title);
            // console.log(unique_blogs_title.length);
            const response = {
                "Total Number of Blogs": fetched_blog_count,
                "Title of Longest Blog": blogWithLongestTitle[0].title,
                "Number of blogs with 'privacy' in the title": privacy_count,
                "Unique Blog Titles": unique_blogs_title,
            };
            return { status: 200, message: response };
        }
        else {
            return { status: 204, message: "Empty Response" };
        }
    }
    else {
        return { status: 404, message: "Not Found" };
    }
};
const getSearchData = async (data, req) => {
    if (data) {
        if (Object.keys(data).length > 0) {
            const response = _.filter(data.blogs, function (o) {
                if (o.title
                    .toLowerCase()
                    .indexOf(req.query.query.toString().toLowerCase()) != -1)
                    return o;
            });
            if (response.length > 0)
                return { status: 200, message: "Match Found", blogs: response };
            else
                return { status: 200, message: "Match Not Found" };
        }
        else {
            return { status: 404, message: "Not Found" };
        }
    }
    else {
        return { status: 404, message: "Not Found" };
    }
};
const memoizedData = _.memoize(getData, () => "cacheKey");
const memoizedAnalyticsData = _.memoize(async () => {
    const data = await memoizedData();
    return getAnalytics(data);
}, () => "cacheKey1");
const memoizedSearchData = _.memoize(async (req) => {
    const data = await memoizedData();
    return getSearchData(data, req);
});
const CACHE_DURATION = 60000; // 5 minutes in milliseconds
// Clear the cache every 5 minutes
setInterval(() => {
    memoizedData.cache.clear();
    memoizedAnalyticsData.cache.clear();
    memoizedSearchData.cache.clear();
}, CACHE_DURATION);
app.get("/api/blog-stats", async (req, res) => {
    try {
        const data = await memoizedAnalyticsData();
        res.status(data.status).json(data.message);
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.get("/api/blog-search", async (req, res) => {
    if (req.query.query === undefined ||
        req.query.query === null ||
        req.query.query === "") {
        res.status(400).json({ error: "Bad Request" });
    }
    else {
        try {
            const data = await memoizedSearchData(req);
            res.status(data.status).json({
                message: data.message,
                data: data.blogs,
            });
        }
        catch (error) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});
app.listen(port, () => {
    console.log("Server listening at ", port);
});
//# sourceMappingURL=index.js.map