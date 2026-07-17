// اطبع values للفيديوهات المقبولة بعد المراجعة بالعين — index في التقرير → videoId.
// الرفض موثّق: مشروع مختلف بنفس الاسم أو محتوى مش لائق (قناة متضررين/مراجعة سلبية).
const r = require('./yt-report.json');
const ACCEPT = {
 0:'WNXJqRIiCGE', 1:'hU5G7CnnhfE', 2:'htYVqMlZV_k', 3:'x8hX7-_ZIz8', 4:'hEaWH7A7gfo',
 6:'NA2f8b5V91k', 7:'F9pzfJ6Gwvk', 8:'pyDqLs-IVNE', 9:'pcimIxHLe70', 10:'l-FPxKx03JE',
 11:'pR8uA_3pFBk', 12:'y9KWd70-qMY', 13:'5X_IWLQUtQ0', 15:'wRNFsulNvXs', 16:'1vF1oPs60y4',
 17:'TWoDy6LQP-k', 18:'5vKumhvmHSA', 19:'kd4WD5-YSa0', 21:'egAttv5youg', 22:'kK934aRMofg',
 23:'WzTjcfmDmoo', 24:'_x0NrIz93XU', 26:'Dly05aKjs6c', 27:'6E90ODQHS5c', 28:'pmvxkODb4j8',
 29:'_X9AKRk418M', 30:'OWaBPeUQgEQ', 31:'osykSRvAGQA', 32:'oI17GXu9MdA', 33:'EEURKG2Pxp0',
 35:'nHsheyzFZW8', 36:'ebKVpoCOxkQ', 37:'U1X1h75vKQA', 38:'NrclgjWQJyY', 39:'PoXmkMOO4WA',
 40:'2cMe966wOnI', 41:'5xEab2qXw5g', 42:'tRGPRWK-chY', 43:'UwwE19cOHdo', 45:'heneuddZ8pU',
 46:'EDgetZeZf28', 47:'tqDYTzSF4aQ', 48:'w3bOsYJoPYM', 49:'dTfzh0yWd4Y', 50:'6Wh3ha_xJyI',
 52:'OSB8Np1h334', 53:'MvdOotOXYmk', 54:'hj2LqaUt3zU', 55:'7YMxJh_3_hk', 56:'4WIsIHdspoA',
 58:'xoBmGXpKB14', 60:'EbWFCc4vqZQ', 62:'0j3iZ2Sl9AI', 63:'QOJ2u5Iufvw', 64:'kdx706VzrWc',
 65:'NJmvJ3kkQ2o', 66:'7YLmvUWCiqI', 67:'3x_k4RdA5AI', 68:'iv9Mq3IDFM8', 69:'3CWzMbsRZm4',
 70:'CbrweowMSaU', 71:'Unqe9Fh2ofs', 73:'jBc9zN5EQ5k', 74:'wNF3csZDwys', 75:'Nd_NBNlMdEo',
 76:'IEUbG9fY8WI', 77:'CedPz8xnM2o', 78:'v91qjHKUCeQ', 79:'dLXbkJyWglU', 80:'xRL039AWQpY',
 81:'3RDSABpJWmk',
};
const rows = Object.entries(ACCEPT).map(([i,vid]) =>
  ` ('${r[i].id}','https://www.youtube.com/watch?v=${vid}')`);
console.log(rows.join(',\n'));
console.error('total:', rows.length);
