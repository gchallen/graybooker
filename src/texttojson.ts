/* eslint-disable @typescript-eslint/no-extra-non-null-assertion */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import appRootPath from "app-root-path"
import chai from "chai"
import fs from "fs/promises"
import jsYaml from "js-yaml"
import _ from "lodash"
import minimist from "minimist"

const expect = chai.expect

const categoryPattern = new RegExp(/^\w\w - (.*)$/)
const subCategoryPattern = new RegExp(/^\d\d\d - (.*)$/)
const personEndPattern = new RegExp(/\$[\d.,]+$/)
const salaryPattern = new RegExp(/([\d.]+) ([\d.]+) \$([\d.,]+) \$([\d.,]+)$/)

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

Promise.resolve()
  .then(async () => {
    const config = _.extend(
      jsYaml.load(await fs.readFile(`${appRootPath}/config.yaml`, "utf8")),
      minimist(process.argv.slice(2))
    )
    const years = config.year ? [config.year] : _.range(config.start, config.end + 1)

    return Promise.all(
      _.map(years, async (year) => {
        const fileTokens = _((await fs.readFile(`./books/${year}.txt`)).toString().split("\n"))
          .map((line) => {
            return line.trim()
          })
          .filter((line) => {
            return line !== ""
          })
          .keyBy((line) => {
            return line
          })
          .value()

        const lines = _((await fs.readFile(`./books/${year}-raw.txt`)).toString().split("\n"))
          .map((line) => {
            return line.trim()
          })
          .filter((line) => {
            return line !== ""
          })
          .value()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const people: { [key: string]: any } = {}
        let currentCategory: string
        let currentSubCategory: string
        let currentName: string
        _.each(lines, (line) => {
          const categoryMatch = categoryPattern.exec(line)
          if (categoryMatch) {
            currentCategory = categoryMatch[1]
            return
          }

          const subCategoryMatch = subCategoryPattern.exec(line)
          if (subCategoryMatch) {
            currentSubCategory = subCategoryMatch[1]
            return
          }

          if (!personEndPattern.exec(line)) {
            return
          }
          const tokens = line.split(" ")
          const employeeCodePosition = _.findLastIndex(tokens, (token) => {
            return token.trim() in config.employeeCodes
          })
          if (employeeCodePosition === -1) {
            return
          }
          const employeeCode = tokens[employeeCodePosition].trim()
          let startsWithPosition = false
          for (const position of config.knownTitles) {
            if (line.startsWith(position)) {
              startsWithPosition = true
              break
            }
          }
          let currentTitle
          if (
            !startsWithPosition &&
            line.includes(", ") &&
            employeeCodePosition >= 3 &&
            tokens[0] !== tokens[0].toUpperCase()
          ) {
            const possibleSplits: { name: string; position: string }[] = []
            for (let i = 1; i < employeeCodePosition; i++) {
              const potentialName = tokens.slice(0, i).join(" ").trim()
              const potentialPosition = tokens.slice(i, employeeCodePosition).join(" ").trim()
              possibleSplits.push({
                name: potentialName,
                position: potentialPosition,
              })
            }
            expect(possibleSplits.length).to.be.at.least(2)
            const correctSplits = _.filter(possibleSplits, ({ name, position }) => {
              return name in fileTokens && position in fileTokens
            })
            if (correctSplits.length === 1) {
              currentName = correctSplits[0].name
              currentTitle = correctSplits[0].position
            } else {
              const correctSplits = _.filter(possibleSplits, ({ name, position }) => {
                return name in fileTokens && position.split(" ").slice(0, -1).join(" ") in fileTokens
              })
              if (correctSplits.length === 1) {
                currentName = correctSplits[0].name
                currentTitle = correctSplits[0].position
              } else {
                const correctSplits = _.filter(possibleSplits, ({ position }) => {
                  return (config.knownTitles as string[]).includes(position)
                })
                if (correctSplits.length === 1) {
                  currentName = correctSplits[0].name
                  currentTitle = correctSplits[0].position
                } else {
                  console.error(`Unmatched line: ${line}`)
                  console.log(possibleSplits)
                }
              }
            }
            /*
        for (let i = 2; i < employeeCodePosition; i++) {
          if (tokens[i].length === 1 && !(possibleName.length > 3 && tokens[i] === 'V')) {
            possibleName.push(tokens[i])
          } else if (tokens[i] === tokens[i].toUpperCase()) {
            currentTitle = tokens.slice(i, employeeCodePosition).join(' ')
            break
          } else {
            possibleName.push(tokens[i])
          }
        }
        let nameParts = possibleName.join(' ').split(',')
        if (nameParts.length === 2) {
          currentName = `${ nameParts[1] } ${ nameParts[0] }`.trim()
        } else {
          currentName = undefined
        }
        */
          } else if (employeeCodePosition >= 1 && tokens[0] === tokens[0].toUpperCase()) {
            expect(currentName).to.be.ok
            currentTitle = tokens.slice(0, employeeCodePosition).join(" ")
          }
          if (!currentTitle || !currentName) {
            let knownTitle: string
            let knownTitleMatch: RegExpExecArray | null
            for (knownTitle of config.knownTitles || []) {
              const regex = new RegExp(`(.*?)${escapeRegExp(knownTitle)}(.*)`)
              knownTitleMatch = regex.exec(line)
              if (knownTitleMatch) {
                break
              }
            }
            if (!knownTitleMatch!!) {
              const possibleNewTitle = tokens.slice(2, employeeCodePosition).join(" ").trim()
              if (possibleNewTitle.length > 0) {
                console.warn(`Possible new title: ${possibleNewTitle} : ${line}`)
              }
              return
            }
            if (knownTitleMatch[1].trim().length > 0) {
              const nameParts = knownTitleMatch[1].trim().split(",")
              expect(nameParts.length, line).to.equal(2)
              currentName = `${nameParts[1]} ${nameParts[0]}`.trim()
            }
            currentTitle = knownTitle!!
          }

          if (employeeCode === "AA") {
            const titleParts = currentTitle.split(" ")
            if (titleParts[titleParts.length - 1] in config.tenureCodes) {
              currentTitle = titleParts.slice(0, titleParts.length - 1).join(" ")
            }
          }
          const salaryPortion = tokens.slice(employeeCodePosition + 1).join(" ")
          const salaryMatch = salaryPattern.exec(salaryPortion)
          expect(salaryMatch, line).to.be.ok
          const person = {
            name: currentName,
            category: currentCategory,
            subCategory: currentSubCategory,
            title: currentTitle.toUpperCase(),
            class: employeeCode,
            presentFTE: parseFloat(salaryMatch!![1]),
            proposedFTE: parseFloat(salaryMatch!![2]),
            presentSalary: parseFloat(salaryMatch!![3].replace(/,/g, "")),
            proposedSalary: parseFloat(salaryMatch!![4].replace(/,/g, "")),
          }
          expect(person.name).to.be.ok
          expect(person.category).to.be.ok
          expect(person.subCategory).to.be.ok
          expect(person.title, `${JSON.stringify(person)} ${line}`).to.be.ok
          expect(person.class).to.be.ok
          expect(person.presentFTE).to.be.a("number")
          expect(person.presentFTE).to.be.at.least(0.0)
          expect(person.proposedFTE).to.be.a("number")
          expect(person.proposedFTE).to.be.at.least(0.0)
          expect(person.presentSalary).to.be.a("number")
          expect(person.presentSalary).to.be.at.least(0.0)
          expect(person.proposedSalary).to.be.a("number")
          expect(person.proposedSalary).to.be.at.least(0.0)

          if (!(person.name in people)) {
            people[person.name] = {
              year,
              presentTotalSalary: 0,
              proposedTotalSalary: 0,
              roles: [],
            }
          }
          people[person.name].presentTotalSalary += person.presentSalary
          people[person.name].proposedTotalSalary += person.proposedSalary
          people[person.name].roles.push(person)
        })

        return { year, people }
      })
    )
  })
  .then((result) => {
    const outputResult = _(result)
      .keyBy((r) => {
        return r.year
      })
      .mapValues((v) => {
        return v.people
      })
      .value()
    return fs.writeFile(`${appRootPath}/output/results.json`, JSON.stringify(outputResult, null, 2))
  })
