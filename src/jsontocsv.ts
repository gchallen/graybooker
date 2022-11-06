import appRootPath from "app-root-path"
import assert from "assert"
import { stringify } from "csv-stringify/sync"
import fs from "fs/promises"
import { ungzip } from "node-gzip"

Promise.resolve().then(async () => {
  const results = JSON.parse((await ungzip(await fs.readFile(`${appRootPath}/output/results.json.gz`))).toString())

  const HEADER = [
    "Year",
    "Name",
    "Present Total Salary",
    "Proposed Total Salary",
    "Location",
    "Category",
    "SubCategory",
    "Title",
    "Class",
    "Present FTE",
    "Proposed FTE",
    "Present Salary",
    "Proposed Salary",
    "Tenure Code",
  ]
  console.log(stringify([HEADER], { quoted: true, escape: "\\" }))

  for (const year of Object.keys(results).sort()) {
    for (const name of Object.keys(results[year]).sort()) {
      const { presentTotalSalary, proposedTotalSalary } = results[year][name]
      for (const role of results[year][name].roles) {
        const data = [
          year,
          name,
          presentTotalSalary,
          proposedTotalSalary,
          role.location,
          role.category,
          role.subCategory,
          role.title,
          role.class,
          role.presentFTE,
          role.proposedFTE,
          role.presentSalary,
          role.proposedSalary,
          role.tenureCode,
        ]
        assert(data.length === HEADER.length)
        const row = stringify([data], { quoted: true, escape: "\\" })
        console.log(row.trim())
      }
    }
  }
})
