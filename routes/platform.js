const ObjectId = require('bson').ObjectId
const constants = require('../constants')
const models = require('../models')

const getCookieStatus = async (platform) => {
  const cookies = await models.Cookie.find({ domain: { $regex: platform.name } })
  if (!cookies || !cookies.length) return constants.cookieStatus.NO_COOKIE
  return constants.cookieStatus.EXISTS
}

module.exports = {
  getPlatformList: async (req, res) => {
    const platforms = await models.Platform.find()
    for (let i = 0; i < platforms.length; i++) {
      platforms[i].cookieStatus = await getCookieStatus(platforms[i])
    }
    await res.json({
      status: 'ok',
      data: platforms
    })
  },
  getPlatform: async (req, res) => {
    const platform = await models.Platform.findOne({ _id: ObjectId(req.params.id) })
    platform.cookieStatus = await getCookieStatus(d)
    await res.json({
      status: 'ok',
      data: platform
    })
  },
  addPlatform: async (req, res) => {
    let Platform = new models.Platform({
      name: req.body.name,
      label: req.body.label,
      editorType: req.body.editorType,
      description: req.body.description,
      enableImport: req.body.enableImport,
      enableLogin: req.body.enableLogin,
      username: req.body.username,
      password: req.body.password,
      createTs: new Date(),
      updateTs: new Date()
    })
    Platform = await Platform.save()
    await res.json({
      status: 'ok',
      data: Platform
    })
  },
  editPlatform: async (req, res) => {
    let platform = await models.Platform.findOne({ _id: ObjectId(req.params.id) })
    if (!platform) {
      return await res.json({
        status: 'ok',
        error: 'not found'
      }, 404)
    }
    platform.name = req.body.name
    platform.label = req.body.label
    platform.editorType = req.body.editorType
    platform.description = req.body.description
    platform.enableImport = req.body.enableImport
    platform.enableLogin = req.body.enableLogin
    platform.username = req.body.username
    platform.password = req.body.password
    platform.updateTs = new Date()
    platform.save()
    await res.json({
      status: 'ok',
      data: platform
    })
  },
  deletePlatform: async (req, res) => {
    let platform = await models.Platform.findOne({ _id: ObjectId(req.params.id) })
    if (!platform) {
      return await res.json({
        status: 'ok',
        error: 'not found'
      }, 404)
    }
    await models.Platform.remove({ _id: ObjectId(req.params.id) })
    await res.json({
      status: 'ok',
      data: platform
    })
  },
  getPlatformArticles: async (req, res) => {
    // ????????????
    const platform = await models.Platform.findOne({ _id: ObjectId(req.params.id) })

    // ??????????????????????????????404??????
    if (!platform) {
      return await res.json({
        status: 'ok',
        error: 'not found'
      }, 404)
    }

    // ?????????????????????
    const ImportSpider = require('../spiders/import/' + platform.name)

    // ??????????????????
    const spider = new ImportSpider(platform.name)

    // ????????????????????????
    const siteArticles = await spider.fetch()

    // ????????????????????????
    for (let i = 0; i < siteArticles.length; i++) {
      // ??????????????????
      const siteArticle = siteArticles[i]

      // ??????title????????????????????????
      const article = await models.Article.findOne({ title: siteArticle.title })

      // ????????????????????????
      siteArticles[i].exists = !!article

      // ???????????????????????????????????????
      let task
      if (article) {
        siteArticles[i].articleId = article._id
        task = await models.Task.findOne({ platformId: platform._id, articleId: article._id })
      }

      // ???????????????????????????
      siteArticles[i].associated = !!(task && task.url && task.url === siteArticle.url)
    }

    // ????????????
    await res.json({
      status: 'ok',
      data: siteArticles
    })
  },
  importPlatformArticles: async (req, res) => {
    // ????????????
    const platform = await models.Platform.findOne({ _id: ObjectId(req.params.id) })

    // ??????????????????????????????404??????
    if (!platform) {
      return await res.json({
        status: 'ok',
        error: 'not found'
      }, 404)
    }

    // ?????????????????????
    const ImportSpider = require('../spiders/import/' + platform.name)

    // ??????????????????
    const spider = new ImportSpider(platform.name)

    // ????????????????????????
    const siteArticles = req.body

    // ????????????
    await spider.import(siteArticles)

    // ????????????
    await res.json({
      status: 'ok'
    })
  },
  checkPlatformCookieStatus: async (req, res) => {
    const platforms = await models.Platform.find()
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i]
      const Spider = require(`../spiders/${platform.name}`)
      const spider = new Spider(null, platform._id.toString())
      try {
        await spider.checkCookieStatus()
      } catch (e) {
        console.error(e)
      }
    }
    await res.json({
      status: 'ok'
    })
  }
}
