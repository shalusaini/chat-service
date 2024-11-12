module.exports = {
  apps: [
    {
      namespace: '5Star',
      name: "rest",
      script: "src/rest.js",
      node_args: "--experimental-specifier-resolution=node --enable-source-maps",
    },
    {
      namespace: '5Star',
      name: "ws",
      script: "src/ws.js",
      node_args: "--experimental-specifier-resolution=node --enable-source-maps",
    },
  ],
}

 // "start": "pm2 start ecosystem.config.cjs"