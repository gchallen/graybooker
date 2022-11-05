import appRootPath from "app-root-path"
import childProcess from "child-process-promise"
import download from "download"
import fs from "fs/promises"
import jsYaml from "js-yaml"
import _ from "lodash"
import minimist from "minimist"

const fileExists = async (path: string) => !!(await fs.stat(path).catch(() => false))

Promise.resolve().then(async () => {
  const config = _.extend(
    jsYaml.load(await fs.readFile(`${appRootPath}/config.yaml`, "utf8")),
    minimist(process.argv.slice(2))
  )
  const years = config.year ? [config.year] : _.range(config.start, config.end + 1)

  Promise.all(
    _.map(years, async (year) => {
      let data
      try {
        data = await download(`${config.currentRoot}GrayBook${year}.pdf`)
      } catch (err) {
        data = await download(`${config.downloadRoot}GrayBook${year}.pdf`)
      }
      const pdfPath = `${appRootPath}/books/${year}.pdf`
      await fs.writeFile(pdfPath, data)
      const textPath = `${appRootPath}/books/${year}.txt`
      const rawTextPath = `${appRootPath}/books/${year}-raw.txt`
      if (!(await fileExists(textPath))) {
        await childProcess.exec(`pdftotext ${pdfPath} ${textPath}`)
      } else {
        console.log(`Not overwriting ${textPath}`)
      }
      if (!(await fileExists(rawTextPath))) {
        await childProcess.exec(`pdftotext -raw ${pdfPath} ${rawTextPath}`)
      } else {
        console.log(`Not overwriting ${rawTextPath}`)
      }
    })
  )
})
