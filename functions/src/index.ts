import * as functions from 'firebase-functions';
const serviceAccount = require('../environments/newKey.json');

// Firebase
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://vision-ff40d.firebaseio.com/'
});


// Cloud Vision
const vision = require('@google-cloud/vision');
const visionClient = new vision.ImageAnnotatorClient();

// Dedicated bucket for cloud function invocation
const bucketName = 'hikma-96b46-vision';

export const imageTagger = functions.storage

  .bucket(bucketName)
  .object()
  .onFinalize(async (object, _context) => {

    // const arrHalal: Array<string> = []
    const arrNonHalal: Array<string> = []

    // File data
    const filePath = object.name || '';

    // Location of saved file in bucket
    const imageUri = `gs://${bucketName}/${filePath}`;

    const docId = filePath.split('.jpg')[0];

    // const docRef = admin.firestore().collection('halalCheck').doc(docId);
    const docRef = admin.database().ref(docId)
    const items = admin.firestore().collection('Ingredients'); 

    // Await the cloud vision response
    const results = await visionClient.textDetection(imageUri);

    // Map the data to desired format
    let nonHalal: boolean = false;
    const textFound = results[0].textAnnotations.map((obj: { description: string }) => obj.description.toLowerCase().toString());
    const textArray = textFound[0].match(/([a-zA-Z0-9][\s]*)+/g);///(?:[^,.:(][^,.:(]+|\([^)]+\))+/g);
    const textDetected = trimArray(textArray);
    console.log(textDetected);

    for (const element of textDetected) {
      // console.log(textDetected[index]);
      var el = capitalize(element)
      console.log(el)
      await items.where('nonhalal', '==', el).get()
        .then(snapshot => {
          if (snapshot.empty) {
            console.log('no match')
          }
          snapshot.forEach(doc => {
            console.log(doc.data());
            // console.log('matching document to ' + textDetected[index]);
            nonHalal = true;
            arrNonHalal.push(el)
          });
          console.log("before exit: arrHalal => " + arrNonHalal, nonHalal)
          return docRef.set({arrNonHalal,nonHalal}); //docRef.set({ nonHalal, arrNonHalal });
        })
        .catch(err => {
          console.log('Error getting documents', err);
        });
    }
  });

function trimArray(arr: Array<string>) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  }
  return arr;
}

function capitalize(s: string) {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const RealTime = functions.storage

  .bucket('hikma-96b46-image-search')
  .object()
  .onFinalize(async (object, _context) => {

    const original = object.name?.split('.jpg')[0]
    console.log(original)

    for(let i = 0; i < 4; i++){
      let name = 'test'.concat(i.toString())
      var doc = admin.database().ref(original).push({name: 'original' + i})
      console.log(doc, name);
    }
 
  });