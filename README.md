# graybooker: Parse Illinois Salary Gray Book

The code is this repository will download and parse salary and other appointment data from the so-called
[Illinois Gray Book](https://www.bot.uillinois.edu/resources/gray_book). This public resource containts salary
information for academic professionals employed by the [University of Illinois](https://illinois.edu/)—but not for
so-called civil service employees. However, most highly-paid roles at the university—including faculty, deans, most
administrators, and coaches—are academic professional roles, and so have salary information in these documents.

Archived Gray Books are available in PDF format from 1961 until 2021, at which point a `.docx` format began to be used.
(Ugh.) However, the format of these PDFs has varied, and they are not trivial to parse.

You probably want to view the explanatory notes at the front of a Gray Book (for example, in the preface of the
[2021 edition](https://www.trustees.uillinois.edu/trustees/resources/historical-files/GrayBook2021.pdf)) before
beginning work on this dataset. The results include academic tenure codes and employee class codes as defined there. The
data also includes categories (e.g., Grainger Engineering) and subcategories (e.g., Computer Science). I'm not sure if
these are listed anywhere, but they can be browsed starting from
[the current Gray Book website](https://www.bot.uillinois.edu/resources/gray_book).

If you find any mistakes—small or serious—please get in touch, or file a PR. I have done a small amount of spot checking
but make no claims that the resulting output is free from errors.

## Motivation

Titles and salary information can be used to answer a number of interesting questions about the modern university, and
this dataset probably has quite a few interesting stories to tell. Even just the range of titles tells a fascinating
story of all the diverse activities at a modern research university. If you use this information to perform an analysis,
please report your results and I'll list them here.

Here's a few ideas to get you started:

- Which departments have the highest salaries? Which have the lowest? Does that correlate in any way with the strength
  of that department?
- Which university employees have seen the largest pay raises (relative or absolute) over this time period, or within a
  single year? Why?
- Which departments employee or spend the most on teaching faculty (lecturers or teaching professor titles) compared to
  research faculty (other professor titles)?
- Can you determine how much administrative overhead has changed during this time period? One potential partition would
  be to consider anyone without an academic title or role to be an administrative employee, and look at the ratio
  between academic v. non-academic spend.
- Similarly, can you measure how academic spend has changed, probably by classifying employees based on their category
  ("NU: Div Intercollegiate Athletics").
- What is the most unusual title in the dataset?
- Which employee has the most listed titles?

Have fun.

## Approach

The code in this repository uses the following approach. First, PDFs are converted to text files using
[`pdftotext`](https://www.xpdfreader.com/pdftotext-man.html). Using the `-raw` option produces more parseable output,
with each line usually containing one employee record. Omitting the `-raw` option produces separate tokens on each line,
which is less immediately useful, but also used during processing as described below. Downloading and converting the
PDFs to `.txt` files is performed by `pdftotext.ts` and can be run by `npm run pdftotext` once project dependencies are
installed. Note that these scripts will not overwrite `.txt` files already present in the repository, since some require
some manual postprocessing.

Next, a second script `texttojson.ts` tries to parse the resulting text files to determine salary and position
information for each person in the PDF. Most lines follow one of several patterns, but because records are not
delimited, record boundaries can be ambiguous. For example, it may be unclear where a person's name ends and their
position begins, given that both names and positions can contain varying number of tokens. The script makes some
educated guesses, and also utilizes the fact that output of `pdftotext` without the `-raw` option usually places one
token on each line. When it gets stuck, it complains loudly and fails, allowing the user to tweak the configuration or
manual edit the input text files to avoid the problem.

All that said, the current approach was developed incrementally, and it's not clear that there isn't a better or more
robust way to tackle this problem. If you find one, feel free to file a PR.

## Results

Currently `graybooker` can parse and extract data for Gray Books from 2007 through 2021, inclusive. The results are in
`output/results.json.gz` as a single JSON file, with top-level keys by year, and each year consisting of keys by name.
Note that it's entirely unclear whether all names are unique across the data set, so common names may include
collisions. (Further deduplication could be done by considering the employee's total salary.) Each name includes all
list roles for that person, since many employees hold multiple titles, even if some titles don't contribute to their
total salary.

## Notes and Limitations

Most text output files require no preprocessing, but the 2021 output did require some manual editing to fix some errors.
Support for earlier PDFs is probably possible, but the format changed in 2006 and that format needs additional work. I
would suspect that support for very old PDFs is probably impossible, or would require a ton of human intervention.
Depending on how the data is structured internally, support for later `.docx` files is probably possible, but will also
require a different strategy.

They Gray Book website also maintains this data in an HTML format, but only for the current year. Scraping the data from
the HTML should be substantially easier. Unfortunately, https://www.bot.uillinois.edu/resources/gray_book seems to be
only archived by `archive.org` going back to 2017 (unless the page changed names). So parsing the PDFs may be the only
way to access older data. But web scraping is probably the best way to get at current and future data.

## Updates

- 2022-11-05: Fixed parser to include academic tenure code. (HT David Dalpiaz.)
- 2022-11-06: Include campus codes in output.
- 2022-11-06: Add CSV output in `output/results.csv.gz`.
