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
    "PresentTotalSalary",
    "ProposedTotalSalary",
    "Location",
    "Category",
    "SubCategory",
    "Title",
    "Class",
    "PresentFTE",
    "ProposedFTE",
    "PresentSalary",
    "ProposedSalary",
    "TenureCode",
  ]
  console.log(stringify([HEADER], { quoted: true, escape: "\\" }).trim())

  const roundTo = (input: number) => Math.round(input * 100) / 100

  for (const year of Object.keys(results).sort()) {
    for (const name of Object.keys(results[year]).sort()) {
      const { presentTotalSalary, proposedTotalSalary } = results[year][name]
      for (const role of results[year][name].roles) {
        const data = [
          year,
          name,
          roundTo(presentTotalSalary),
          roundTo(proposedTotalSalary),
          role.campus,
          role.category,
          role.subCategory,
          role.title,
          role.class,
          role.presentFTE,
          role.proposedFTE,
          roundTo(role.presentSalary),
          roundTo(role.proposedSalary),
          role.tenureCode || "-",
        ]
        assert(data.length === HEADER.length)
        const row = stringify([data], { quoted: true, escape: "\\" })
        console.log(row.trim())
      }
    }
  }
})
