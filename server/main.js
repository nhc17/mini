const express = require('express'),
      admin = require('firebase-admin'),
      bp = require('body-parser'),
      googleStorage = require('@google-cloud/storage'),
      multer = require('multer'),
      uuidv5 = require('uuid/v5')
     // cors = require('cors')
      path = require('path');

const app = express();

const API_URI = "/api";

//app.use(cors());
    
//initialize Firebase
const credFile = process.env.Svc_Cred_File || "./f.json";

var serviceAccount = require(credFile);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mini-bbb5b.firebaseio.com"
});

var db = admin.firestore();

var authorsCollection = db.collection('authors');
var topicsCollection = db.collection('topics');
var articlesCollection = db.collection('articles');

//export Google_Application_Credentials
const gStorage = googleStorage({
    projectId: "mini-bbb5b"
});

const bucket = gStorage.bucket("mini-bbb5b.appspot.com");
const googleMulter = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024 //20MB
    }
})

var addCounter = 0;
var updateCounter = 0;

var unSubscribe = subscribeArticles();

function subscribeArticles() {
    return articlesCollection.onSnapshot((snapshot) => {
        if(!snapshot.empty) {
            console.log(snapshot);
            snapshot.docChanges.forEach((data) => {
                console.log(`==>${ Date() } ${ updateCounter }` + data.type);
                if(data.type === 'modified') {
                    updateCounter = updateCounter + 1
                }else if(data.type === 'added') {
                    addCounter = addCounter + 1;
                }
            })
        }
    });
}
/////////////////////////// READ ///////////////////////////////////////////
// GET array of authors
app.get(API_URI + '/authors/search', (req, res) => {
    authorsCollection
    .get()
    // console.log(authorsCollection)
    .then(snapshot => {
        let authorsArr = [];
        snapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
            authorsArr.push(doc.data());       
    });
    res.status(200).json(authorsArr);
   })
   .catch(err => {
     console.log('Error getting documents', err);
  }); 
});


// GET one author with associated title
app.get(API_URI + '/author/search', (req, res) => {
    let firstname = req.query.firstname;
    let lastname = req.query.lastname;
    let titles = req.query.title
    console.log(firstname, lastname);
    if (typeof(firstname === 'undefined') 
        && typeof(lastname === 'undefined') 
        && typeof(titles === "undefined")){
        if (firstname === '' 
        && lastname === ''
        && titles === ''){
            console.log('firstname, lastname, topic and article is undefined');
            res.status(500).json({error: "firstname, lastname, topic & article are undefined"});
        }
    }
    authorsCollection
        .where('firstname', '==', firstname)
        .where('lastname', '==', lastname)
        .limit(10)
    articlesCollection
        .where('title', '==', titles)
    .get()
    .then(snapshot => {
        console.log(">>>snapshot");
        let authorsArr = [];
        let articlesArr = [];
        snapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
            authorsArr.push(doc.data());
            articlesArr.push(doc.data());
        });
        res.status(200).json(authorsArr, articlesArr);
      })
      .catch(err => {
          console.log('Error getting documents', err);
          res.status(500).json(err);
     });
  });

  // GET array of articles by topic
app.get(API_URI + '/articles/search', (req, res) => {
    let topics = req.query.topic
    console.log(topic);
    if (typeof(topic === 'undefined')){
        if (topic === '') {
            console.log('topic is undefined');
            res.status(500).json({error: "topic is undefined"});
        }
    }
    topicsCollection
        .where('topic', '==', topic)
        .limit(5)
    articlesCollection
    .get()
    // console.log(authorsCollection)
    .then(snapshot => {
        let articlesArr = [];
        snapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
            articlesArr.push(doc.data());       
    });
    res.status(200).json(authorsArr);
   })
   .catch(err => {
     console.log('Error getting documents', err);
  }); 
});


// GET one article by topic & title
app.get(API_URI + '/article/search', (req, res) => {
    let topics = req.query.topic
    let titles = req.query.title
    console.log(topic, title);
    if (typeof(topic === 'undefined') 
        && typeof(title === 'undefined')){
        if (firstname === '' 
        && lastname === ''
        && titles === ''){
            console.log('firstname, lastname, topic and article is undefined');
            res.status(500).json({error: "firstname, lastname, topic & article are undefined"});
        }
    }
    topicsCollection
        .where('topic', '==', topics)
        .limit(10)
    articlesCollection
        .where('title', '==', titles)
    .get()
    .then(snapshot => {
        console.log(">>>snapshot");
        let topicsArr = [];
        let articlesArr = [];
        snapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
            topicsArr.push(doc.data());
            articlesArr.push(doc.data());
        });
        res.status(200).json(topicsArr, articlesArr);
      })
      .catch(err => {
          console.log('Error getting documents', err);
          res.status(500).json(err);
     });
  });


  ///////////////// CREATE //////////////////////////////
  // Add one author
  app.post(API_URI + '/authors', bp.urlencoded({ extended: true}), bp.json({ limit: "10MB" }), (req, res) => { 
    let author = { ...req.body };
    console.log(".....author" + JSON.stringify(author));
    authorsCollection
        .add(author)
        .then(result => res.status(200).json("Author name added"))
        .catch(error => res.status(500).json(error));
})
 
//Add one topic
app.post(API_URI + '/topics', bp.urlencoded({ extended: true}), bp.json({ limit: "10MB" }), (req, res) => { 
    let topic_name = { ...req.body };
    console.log(".....topics" + JSON.stringify(topic_name));
    topicsCollection
        .add(topic_name)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
})

// Add one article with associated topic by the author
app.post(API_URI + '/articles', bp.urlencoded({ extended: true}), bp.json({ limit: "50MB" }), (req, res) => {
    let article = {... req.body };
    console.log(".....articles" + JSON.stringify(article));
    articlesCollection
        .add(article)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(500).json(error));
    })


//////////////// UPDATE ////////////
// Edit title
app.put(API_URI + '/articles/:id', bp.urlencoded({ extended: true }), bp.json({ limit: "50MB" }), (req, res) => {
    let idValue = req.params.id;
    console.log(idValue);
    console.log(JSON.stringify(req.body));
    let article = {... req.body};
    articlesCollection.doc(idValue).update(
        article,
        { merge: true });
        console.log(article)
    res.status(200).json(article);
});


///////////////// UPLOAD ///////////////////
function debugReq(req, res, next) {
    console.log(req.file);
    next();
}

//Upload single image
app.post(API_URI + '/upload', debugReq, bp.urlencoded({ extended: true }), bp.json({ limit: "20MB" }),
    googleMulter.single('img'), (req, res) => {
        console.log("....uploading: ");
        if(req.file.length) {
           console.log("uploaded");
           console.log(req.file);
           uploadToFirebaseStorage(req.file).then((result) => {
               console.log(result);
               console.log(result.data);
               var galleryData = {
                   filename: result
               }
               galleryCollection
               .add(galleryData)
               .then(result => res.status(200).json(galleryData))
               .catch(error => res.status(500).json(error));
           }).catch((error) => {
               console.log(error);
               res.status(500).json(error);
           })
        } else {
            res.status(500).json({ error: "error in uploading"});
        }
    });

    const uploadToFirebaseStorage = (fileObject) => {
        return new Promise((resolve, reject) => {
            if(!fileObject) {
                reject("Invalid file upload attempt");
            }

            let idValue = uuidv5('', uuidv5.DNS);
            console.log(idValue);

            let newFilename = `${idValue}_${fileObject.originalname}`
            console.log(newFilename);

            let firebaseFileUpload = bucket.file(newFilename);
            console.log(firebaseFileUpload);

            const blobStream = firebaseFileUpload.createWriteStream({
                metadata: {
                    contentType: fileObject.mimeType
                }
            });

            blobStream.on("error", (error) => {
                console.log("error uploading" + error);
                reject("Error uploading file!");
            });

            blobStream.on("complete", () => {
                console.log("Uploading completed");
                let firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/mini-bbb5b.appspot.com/o/${firebaseFileUpload.name}?alt=media&token=9d608f06-1fdc-40dc-8045-aa9a6b20b635`;
                fileObject.fileURL = firebaseUrl;
                resolve(firebaseUrl);
            });

            blobStream.end(fileObject.buffer);
        });
    }

//Upload an array of images
app.post(API_URI + '/upload-multiple', googleMulter.array('imgs, 6'), (req, res, next) => {
    res.status(200).json({});
});

////////////////// DELETE ///////////////////////////////
app.delete(API_URI + '/delete/articles/:id', (req, res) => {
    let idValue = req.params.id;
    articlesCollection.doc(idValue).delete().then((result) => {
        res.status(200).json(result);
    }).catch((error) => {
        res.status(500).json(error);
    });
});


//////////////// Static Assets ////////////////////////

app.use(express.static(path.join(__dirname, '/public/mini-client_angular')));

///////////// UNSUBSCRIBE & SUBSCRIBE TO LISTENING FOR CHANGES ///////////
app.get(API_URI + '/unsubscribe-article', (req, res) => {
    unSubscribe();
    res.status(200).json({ addCounter, updateCounter});
});

app.get(API_URI + '/subscribe-article', (req, res) => {
    unSubscribe = subscribeArticles();
    res.status(200).json({ addCounter, updateCounter });
})


//////////////// START SERVER //////////////////////////////
const PORT = parseInt(process.argv[2]) || parseInt(process.env.APP_PORT) || 3000;
app.listen(PORT, () => {
    console.info(`Application started on port %d at %s`, PORT, new Date());
});