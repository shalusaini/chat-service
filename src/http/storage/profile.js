// const { StorageType } = require( "../../base/storage.js");
// export const ImageRules = 'size:10m,1b|mime:jpg,jpeg,png';
// const profile = {};
// profile[StorageType.ThreadImage] = {
//     type: StorageType.ThreadImage,
//     folder: 'threads',
//     rules: `required|${ImageRules}`,
//     utype: '*',
//     thumbnail: { height: 480, withoutEnlargement: true },
// };
// profile[StorageType.MessageImage] = {
//     type: StorageType.MessageImage,
//     folder: 'messages',
//     rules: `required|${ImageRules}`,
//     utype: '*',
//     thumbnail: { height: 480, withoutEnlargement: true },
// };
// profile[StorageType.MessageAttachment] = {
//     type: StorageType.MessageAttachment,
//     folder: 'messages',
//     rules: 'required|size:100m,1b',
//     utype: '*',
// };
// profile[StorageType.MessageVideo] = {
//     type: StorageType.MessageVideo,
//     folder: 'messages',
//     rules: 'required|size:100m,1b',
//     utype: '*',
//     customThumb: true,
//     thumbnail: { height: 480, withoutEnlargement: true },
// };
// export default profile;
// //# sourceMappingURL=profile.js.map
const { StorageType } = require('../../base/storage.js')
const ImageRules = 'size:10m,1b|mime:jpg,jpeg,png'
const storageProfile = {}

storageProfile[StorageType.ThreadImage] = {
  type: StorageType.ThreadImage,
  folder: 'threads',
  rules: `required|${ImageRules}`,
  utype: '*',
  thumbnail: { height: 480, withoutEnlargement: true }
}
storageProfile[StorageType.MessageImage] = {
  type: StorageType.MessageImage,
  folder: 'messages',
  rules: `required|${ImageRules}`,
  utype: '*',
  thumbnail: { height: 480, withoutEnlargement: true }
}
storageProfile[StorageType.MessageAttachment] = {
  type: StorageType.MessageAttachment,
  folder: 'messages',
  rules: 'required|size:100m,1b',
  utype: '*'
}
storageProfile[StorageType.MessageVideo] = {
  type: StorageType.MessageVideo,
  folder: 'messages',
  rules: 'required|size:100m,1b',
  utype: '*',
  customThumb: true,
  thumbnail: { height: 480, withoutEnlargement: true }
}

module.exports = {
  storageProfile,
  ImageRules
}
