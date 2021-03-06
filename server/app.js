
const assert = require('assert');
const http = require('http');
const URLlib = require('url');
const path = require('path');
const fs = require('fs');
const user = require('./user.js');
const db = require('./db.js');
const config = require('./config.js');
const view = require('./view.js');

db.init();
user.init();
var server = http.createServer(function (req, res) {

    const { headers, method, url } = req;
    console.log(` ${method} ${url}`);

    const parsedUrl = URLlib.parse(url, true);
    req.parsedPath = decodeURI(parsedUrl.pathname);
    req.parsedUrl = parsedUrl;

    if (isFile(req.parsedPath))
        handleFile(req, res);
    else
        handleRoutine(req, res);

});
const port = process.env.PORT || 1337;
server.listen(port);
console.log(`Server running at  ${port}`);

//file handle-----------------------------------
function isFile(filePathStr) {
    if (filePathStr.indexOf('.') == -1)
        return false;
    return true;
}
function getFileData(file, req, res, fun) {
    if (!fs.existsSync(file)) {
        res.statusCode = 404;
        res.end(`Error: File ${file} not found!`);

    }
    fs.readFile(file, function (err, data) {
        if (err) {
            res.statusCode = 500;
            res.end(`Error: can't read the file: ${err}.`);

        } else {
            fun(data);
        }


    });
}
function handleFile(req, res) {
    let fileFullPath = `.${req.parsedPath}`;

    getFileData(fileFullPath, req, res, function (data) {
        if (data == null)
            return;
        const mimeType = {
            '.ico': 'image/x-icon',
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.eot': 'appliaction/vnd.ms-fontobject',
            '.ttf': 'aplication/font-sfnt'
        };
        const ext = path.parse(fileFullPath).ext;
        res.setHeader('Content-type', mimeType[ext] || 'text/plain');
        res.end(data);
    });
}

//router--------------------------------------------
function getUserViewAndMenu(userData) {
    let routeArr = splitRoute(userData.currentUrl);
    userData.currentView = view.map[routeArr[1]];
    userData.currentMenu = routeArr[2];
}
function setDefaultLanguage(userData) {
    if (userData.language === "undefined")
        userData.language = "USA";
}
function find3File(fullPath) {
    let htmlFile = fullPath + ".html";
    let jsFile = fullPath + ".js";
    let cssFile = fullPath + ".css";
    let htmlExist = "0";
    let jsExist = "0";
    let cssExist = "0";
    if (fs.existsSync(htmlFile)) htmlExist = "1";
    if (fs.existsSync(jsFile)) jsExist = "1";
    if (fs.existsSync(cssFile)) cssExist = "1";
    return htmlExist + jsExist + cssExist;
}
function readHtmlFile(fileFullName, res) {
    let result;
    fs.readFile(fileFullName, function (err, data) {
        if (err) {
            result = ["err", err];
        } else {
            result = ["ok", data];
        }
        sendResult("text/html", result, res);
    });


}
function readSVG(fileFullName, res) {
    let result;
    fs.readFile(fileFullName, function (err, data) {
        if (err) {
            result = ["err", err];
        } else {
            result = ["ok", data];
        }
        sendResult("image/svg+xml", result, res);
    });

}

function sendResult(type, result, res) {
    if (result[0] === "err") {
        res.statusCode = 500;
        res.end(`Error: can't read the file: ${result[1]}.`);
        return null;
    } else {
        res.setHeader('Content-type', type);
        res.end(result[1]);
    }

}
let systemRoutine = {
    "loadNew": function (req, res) {
        let path = req.parsedUrl.query.data;
        let file = req.parsedPath.slice(req.parsedPath.indexOf("/loadNew") + "/loadNew".length);
        let result = find3File(`.${path + file}`);
        res.end(result);
    },
    "loadHtml": function (req, res) {
        let file = req.parsedPath.slice(req.parsedPath.indexOf("loadHtml") + "loadHtml".length);
        let fileFullName = `.${file}.html`;
        readHtmlFile(fileFullName, res);
    },
    "loadSVG": function (req, res) {
        let file = req.parsedPath.slice(req.parsedPath.indexOf("loadSVG") + "loadSVG".length);
        let fileFullName = `.${file}.svg`;
        readSVG(fileFullName, res);
    },

    "readHtml": function (req, res) {
        let path = req.parsedUrl.query.data;
        let file = req.parsedPath.slice(req.parsedPath.indexOf("readHtml") + "readHtml".length);
        let fileFullName = `.${path + file}.html`;
        readHtmlFile(fileFullName, res);

    },
    "readCodeFile": function (req, res) {
        let filepath = req.parsedPath.slice(req.parsedPath.indexOf("readCodeFile") + "readCodeFile".length);
        let fileFullName = `./assets/code${filepath}.js`;
        const REPLACE_STR = "____________";
        const replaceRegex = new RegExp(REPLACE_STR);
        fs.readFile(fileFullName, 'utf8', function (err, data) {
            if (err) {
                res.statusCode = 500;
                res.end(`Error: can't read the file: ${err}.`);
                return null;
            } else {
                let arr = data.split(/\r?\n/);
                for (let i = 0; i < arr.length; i++) {
                    let line = arr[i];
                    let spaceAtBegin = line.match(/^\s*/g);
                    let indent = spaceAtBegin;
                    let s = line.split("//");

                    let normal = s[0];
                    let comment = s[1];
                    comment = markComment(comment);
                    normal = markString(normal);
                    normal = markKeyWord(normal);
                    normal = markSysProperty(normal);
                    normal = markFun(normal);

                    arr[i] = `<pre>${indent + normal + comment}</pre><br>`;
                }
                let result = arr.join("");
                res.setHeader('Content-type', 'text/html');
                res.end(result);
            }
        });


        function markComment(str) {
            if (str == undefined)
                return "";
            else
                return `<span class='codeComment'> //${str}</span>`;
        }
        function markString(str) {
            let regex = new RegExp(/("(.*?)")|('(.*?)')/, "g");
            let quotes = str.match(regex);
            if (quotes == null) return str;
            let a = str.replace(regex, REPLACE_STR);
            for (let i = 0; i < quotes.length; i++) {
                const quote = quotes[i];
                let word = quote.slice(1, -1);
                let symbol = quote[0];
                word = `${symbol}<span class="codeString">${word}</span>${symbol}`;
                a = a.replace(replaceRegex, word);
            }

            return a;
        }
        function markKeyWord(str) {
            const keywords =
                [
                    "function",
                    "typeof",
                    "let", "var",
                    "instanceof",
                    "return", "new"
                ];
            for (let i = 0; i < keywords.length; i++) {
                let re = new RegExp("\\b" + keywords[i] + "\\b", 'g');
                str = str.replace(re, "<em class='keywords'>" + keywords[i] + "</em>");
            }
            return str;
        }
        function markSysProperty(str) {
            const systemProperty =
                [
                    "constructor",
                    "prototype"
                ];
            for (let i = 0; i < systemProperty.length; i++) {
                let re = new RegExp(systemProperty[i], 'g');
                str = str.replace(re, "<span class='systemProperty'>" + systemProperty[i] + "</span>");
            }
            return str;
        }
        function markSysFun(str) {
            const systemFun =
                [
                    "isPrototypeOf",
                ];
            for (let i = 0; i < systemFun.length; i++) {
                let re = new RegExp(systemFun[i], 'g');
                str = str.replace(re, "<span class='systemFun'>" + systemFun[i] + "</span>");
            }
            return str;
        }
        function markFun(str) {

            let re = new RegExp(/\w+\(/, "g");
            let a = str.replace(re, REPLACE_STR);
            let arr = [];
            let m;
            do {
                m = re.exec(str);
                if (m) {
                    arr.push(m[0]);
                }
            } while (m);
            for (let i = 0; i < arr.length; i++) {
                let s = arr[i];
                let n = s.slice(0, s.indexOf("("));
                if (isSystemFun(n)) {
                    arr[i] = `<span class='systemFun'>${n}</span>(`;
                } else {
                    arr[i] = `<span class='customFun'>${n}</span>(`;
                }
                a = a.replace(replaceRegex, arr[i]);
            }


            return a;
            function isSystemFun(str) {
                const systemFun =
                    [
                        "isPrototypeOf",
                    ];
                for (let i = 0; i < systemFun.length; i++) {
                    if (str === systemFun[i])
                        return true;

                }
                return false;

            }
        }
    },
    "identify": function (req, res) {
        getBody(req, function (userData) {
            getUserViewAndMenu(userData);
            setDefaultLanguage(userData);
            if (userData.id == null) {
                user.createNew(userData, function (newUser) {
                    returnData(res, user.packageData(newUser));
                });
            } else {
                user.getById({
                    id: userData.id,
                    okfun: function (findUser) {
                        user.update(findUser, userData, function (updatedUser) {
                            returnData(res, user.packageData(updatedUser));
                        });
                    },
                    failfun: function () {
                        user.createNew(userData, function (newUser) {
                            returnData(res, user.packageData(newUser));
                        });
                    }
                });
            }

        });


    },
    "directToUrl": function (req, res) {
        getBody(req, function (userData) {
            user.getById({
                id: userData.id,
                okfun: function (findUser) {
                    userData.currentUrl = new Buffer(req.b_Id, 'base64').toString('ascii');
                    getUserViewAndMenu(userData);
                    user.updateUrlAndHistory(findUser, userData, function (updatedUser) {
                        console.log('update url and history');
                        returnData(res, user.packageData(updatedUser));
                    });
                }

            });
        });

    },

    "changeLanguage": function (req, res) {
        getBody(req, function (userData) {
            user.getById({
                id: userData.id,
                okfun: function (findUser) {
                    newlanguage = req.b_Id;
                    getUserViewAndMenu(findUser);
                    user.updateLanguage(findUser, newlanguage, function (updatedUser) {
                        console.log('language setting has been saved!');
                        returnData(res, user.packageData(updatedUser));
                    });
                },

            });
        });


    },
    "getUIText": function (req, res) {
        // console.log("getUIText--" + res.b_Id);
        let language = req.routeArr[3];
        let txt = decodeURI(req.b_Id);
        db.UI.findOne({ "USA": txt }, function (err, text) {
            assert(err == null, err);
            // console.log(text.CHN) ;
            let encoded;
            if (text == null) {
                encoded = encodeURI(txt);
            }
            else {
                encoded = encodeURI(text[language]);
            }
            res.setHeader('Content-type', "text/plain;charset=utf-8");
            res.end(encoded);//"no define in db(ui)"
        });

    },
    "getContentText": function (req, res) {
        let language = req.routeArr[3];
        let txt = decodeURI(req.b_Id);
        db.Content.findOne({ "contentName": txt }, function (err, text) {
            assert(err == null, err);
            res.setHeader('Content-type', "text/plain;charset=utf-8");
            if (text == null) {
                let send = Buffer.from(`${req.b_Id} no define in db`).toString('base64');
                res.end(send);
            } else {
                res.end(text[language]);
            }
        });

    },
    "getInvertTranslateText": function (req, res) {
        let language = req.routeArr[3];
        let txt = decodeURI(req.b_Id);
        db.UI.findOne({ "USA": txt }, function (err, text) {
            assert(err == null, err);
            // console.log(text.CHN) ;
            let encoded;
            if (text == null) {
                encoded = encodeURI(txt);
            }
            else {
                if (language === "USA")
                    encoded = encodeURI(text.CHN);
                else if (language === "CHN")
                    encoded = encodeURI(text.USA);

            }
            res.setHeader('Content-type', "text/plain;charset=utf-8");
            res.end(encoded);//"no define in db(ui)"
        });

    },
    "fileExist": function (req, res) {
        let filepath = req.parsedPath.slice(req.parsedPath.indexOf("fileExist") + "fileExist".length, req.parsedPath.lastIndexOf("/"));
        let filetype = req.parsedPath.slice(req.parsedPath.lastIndexOf("/") + 1);
        let fileFullName = `.${filepath}.${filetype}`;
        res.setHeader('Content-type', "text/plain;charset=utf-8");
        if (fs.existsSync(fileFullName)) {
            res.end("yes");
        }
        else {
            res.end("no");
        }
    },


    "getShader": function (req, res) {
        let filePath = new Buffer(req.b_Id, 'base64').toString('ascii');
        fs.readFile(`.${filePath}`, function (err, data) {
            if (err) {
                res.statusCode = 500;
                res.end(`Error: can't read the file: ${err}.`);
                return null;
            } else {
                res.setHeader('Content-type', 'text/plain;charset=utf-8');
                res.end(data);
            }
        });
    },


};
//!!!
let subRoutine = {
    "": function (req, res) {
        // readHtmlFile("./client/index.html", res);
        // readHtmlFile("./iframes/begin/main.html", res);
        // readHtmlFile("./iframes/draw2D/main.html", res);

        // readHtmlFile("./iframes/transparent/main.html", res);
        // readHtmlFile("./iframes/transparentBackground/transparent.html", res);

        //portfolio
        // readHtmlFile("./client/portfolio/index.html", res);
        // readHtmlFile("./client/portfolio/works/animatedLine/main.html", res);


        //LeetCode
        // readHtmlFile("./client/leetCode/main.html", res);
        //

        //Ezza js
        // readHtmlFile("./iframes/ezza/index.html", res);


        //DATA524 
        // readHtmlFile("./iframes/data524/index.html", res);

        //three.js
        // readHtmlFile("./iframes/robotarm/main.html", res);
        // readHtmlFile("./iframes/loadGLTF/main.html", res);
        // readHtmlFile("./iframes/line/animateLine.html", res);
        // readHtmlFile("./iframes/projectCameraToScreen/main.html", res);
        // readHtmlFile("./iframes/projectScreenToCamera/main.html", res);

        // readHtmlFile("./iframes/viewInView/main.html", res);
        // readHtmlFile("./iframes/rotateObj/main.html", res);
        // readHtmlFile("./iframes/rotateCamera/main.html", res);
        //canvas
        // readHtmlFile("./iframes/canvasTest/draw/main.html", res);

        //webgl
        // basic
        // readHtmlFile("./iframes/webgl/f01_simple/main.html", res);
        // readHtmlFile("./iframes/webgl/f02_rectangle/main.html", res);
        // readHtmlFile("./iframes/webgl/f03_multiRectangle/main.html", res);
        // readHtmlFile("./iframes/webgl/f04_displayImage/main.html", res);
        // readHtmlFile("./iframes/webgl/f05_translateVetexPos/main.html", res);
        // readHtmlFile("./iframes/webgl/f06_translateVetexPosInShader/main.html", res);
        // readHtmlFile("./iframes/webgl/f07_rotationUseShader/main.html", res);
        // readHtmlFile("./iframes/webgl/f08_transform2DUseMatrix/main.html", res);
        // readHtmlFile("./iframes/webgl/f09_Orthographic3D/main.html", res);
        // readHtmlFile("./iframes/webgl/f10_Perspect/main.html", res);
        // readHtmlFile("./iframes/webgl/f11_Camera/main.html", res);
        // readHtmlFile("./iframes/webgl/f12_Animation/main.html", res);


        //threeExample
        // readHtmlFile("./threejsExample/SVGCanvas/main.html", res);
        // readHtmlFile("./threejsExample/SVGMesh/main.html", res);

        // readHtmlFile("./threejsExample/drawSVG/main.html", res);
        // readHtmlFile("./threejsExample/rawshader/main.html", res);
        // readHtmlFile("./threejsExample/f01-triangle/main.html", res);
        // readHtmlFile("./threejsExample/f03-text/main.html", res);
        // readHtmlFile("./threejsExample/f03-textCanvas/main.html", res);
        // readHtmlFile("./threejsExample/f03-textTexture/main.html", res);
        // readHtmlFile("./threejsExample/f03-textGlyph/main.html", res);
        // readHtmlFile("./threejsExample/f03-textCss/main.html", res);
        // readHtmlFile("./threejsExample/f04-renderToTexture/main.html", res);
        readHtmlFile("./threejsExample/f05-css3D/main.html", res);


        // readHtmlFile("./iframes/webgl/draw/main.html", res);


        // readHtmlFile("./iframes/canvasTest/draw/main.html", res);



    },
    "getMainMenu": function (req, res) {
        let mainMenu = config.mainMenu;
        res.setHeader('Content-type', "text/plain;charset=utf-8");
        res.end(JSON.stringify(mainMenu));
    },
    "detail": function (req, res) {
        renderHtml(res);

    },
    // "getCurrentMenu": function (req, res) {
    //     user.getByIp({

    //         ip: req.connection.remoteAddress,
    //         okfun: function (findUser) {
    //             res.setHeader('Content-type', "text/plain;charset=utf-8");
    //             res.end(JSON.stringify(findUser.currentMenu));

    //         },
    //         info: "getCurrentMenu",
    //     });


    // },
    "getMenuPath": function (req, res) {
        let currentMenu = req.routeArr[2];
        let mainMenu = config.mainMenu;
        let menuPath = searchMenuTree(currentMenu, mainMenu);
        res.setHeader('Content-type', "text/plain;charset=utf-8");
        res.end(JSON.stringify(menuPath));

    }
};
function splitRoute(parsedPath) {
    let routeArr = parsedPath.split("/");
    if (routeArr[routeArr.length - 1] != "")
        routeArr.push("");
    return routeArr;
}
function handleRoutine(req, res) {
    let { parsedPath, method } = req;
    let routeArr = splitRoute(parsedPath);
    routeArr.push(req.method);
    req.b_name = routeArr[1];
    if (routeArr[1] !== "") {
        routeArr[1] = "b";
    }

    if (routeArr.length > 2) {
        let index = routeArr[2].indexOf(":");
        if (index != -1) {
            req.b_Id = routeArr[2].slice(index + 1);
            routeArr[2] = ":";

        }
    }

    req.routeArr = routeArr;

    if (systemRoutine[req.b_name] != undefined) {
        systemRoutine[req.b_name](req, res);
    }
    else if (subRoutine[req.b_name] != undefined) {
        subRoutine[req.b_name](req, res);
    }
    else {
        res.end("routine" + req.b_Name + "undefined");
    }
}

//data---
function getBody(req, fun) {
    let { method } = req;
    console.log(`receive ${method} body`);
    if (method == "POST" || method == "PUT") {
        let body = '';
        req.on('data', function (data) {
            body += data;
            console.log("Partial body: " + body);
        });
        req.on('end', function () {
            console.log("Body: " + body);
            assert(body != "", "post body is empty");
            fun(JSON.parse(body));
        });
    }
    if (method == "GET") {
        let body = req.parsedUrl.query.data;
        console.log("Body: " + body);
        assert(body != "" || body != "null", "post body is empty");
        fun(JSON.parse(body));
    }

}
function returnData(res, data) {
    res.setHeader('Content-type', "text/plain;charset=utf8");
    res.end(JSON.stringify(data));
    return;
}
function renderHtml(res) {
    res.setHeader('Content-type', "text/html");
    var html = `<!DOCTYPE html>
<html>
<head>
<title>webgl</title>
<link rel="stylesheet" type="text/css" href="/client/style.css">
<script type="text/javascript" src="/client/xs.js"></script>
</head>
<body onload="xs.begin()">
</body>
</html>`;
    res.end(html);
}


function searchMenuTree(searchItem, mainMenu) {
    let level = 0;
    let find = false;
    let menuPath = new buildMenuPath(mainMenu);
    findDefaultPath(menuPath);
    return menuPath;

    function buildMenuPath(menuTree) {
        let branchPath;
        level++;
        for (let i = 0; i < menuTree.length; i++) {

            if (find == true)
                break;

            branchPath = [];

            const branch = menuTree[i];
            branchPath.push(branch);
            // if (branch.url != undefined) {
            //     let url = branch.url;
            //     let detailName = url.slice(url.indexOf("/detail/") + 8);
            if (branch.name === searchItem) {
                level--;
                find = true;
                return branchPath;

            }
            // }
            if (branch.subMenu != undefined) {
                let newBranch = new buildMenuPath(branch.subMenu);
                if (newBranch != null)
                    addArrToArr(newBranch, branchPath);
            }
        }
        level--;
        return branchPath;


    }
    function addArrToArr(arr1, arr2) {
        for (let i = 0; i < arr1.length; i++) {
            const e = arr1[i];
            arr2.push(e);
        }
    }
    function findDefaultPath(pathArr) {
        let last = pathArr[pathArr.length - 1];

        let subMenu = last;
        while (subMenu.subMenu != undefined) {
            subMenu = subMenu.subMenu[0];
            pathArr.push(subMenu);
        }

    }
}