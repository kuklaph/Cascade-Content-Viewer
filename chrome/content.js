document.addEventListener("load", main);

// Check for menu edit button
// Add onclick event listener
// Check for data fields
// Acquire helpful data based on type of data field
// Append helpful data to Content Row body

class Menu {
  checkForEditButton() {
    const menuList = document.getElementById("menu-action");
    if (!menuList) {
      return;
    }
    const editLink = menuList.querySelector("#edit-link");
    if (!editLink) {
      return;
    }
    return editLink;
  }
}

class Content {
  constructor() {
    this.contentRows = null;
  }

  addResumeEditingListener() {
    const resumeEditButton = document.getElementById("draft-overwrite-resume");
    if (!resumeEditButton) {
      return;
    }
    resumeEditButton.addEventListener("click", () => {
      setTimeout(checkContents, 2000);
    });
  }

  checkContentsForRows() {
    const checkForStructuredData = document.getElementById("structured-data");
    if (!checkForStructuredData) {
      return;
    }
    const hasDataDefinitionID =
      checkForStructuredData.querySelector(".data-definition");
    if (!hasDataDefinitionID) {
      return;
    }
    const narrowContentRowNodeList = hasDataDefinitionID.querySelectorAll(
      `.sd-multi-group > .form-group.form-group-collapsible.sd-group.multi-group[data-sd-field-path="narrow-content/row"]`
    );
    const contentRowNodeList = hasDataDefinitionID.querySelectorAll(
      `.sd-multi-group > .form-group.form-group-collapsible.sd-group.multi-group[data-sd-field-path="row"]`
    );
    if (!contentRowNodeList.length && !narrowContentRowNodeList.length) {
      return;
    }
    const nodeList = { narrowContentRowNodeList, contentRowNodeList };
    return nodeList;
  }

  addCollapseListeners(contentRows) {
    for (const cRow of contentRows) {
      const collapseButton = cRow.querySelector(
        ".sd-group-button-root-collapse.collapsed.cs-tooltip"
      );
      collapseButton.addEventListener("click", () => {
        this.update(contentRows);
      });
    }
  }

  update(contentRows) {
    for (const cRow of contentRows) {
      const row = new Row(cRow);
      row
        .setIndex()
        .extractChildren()
        .mapToObj()
        .filterObjectForData()
        .createDivAndUpdate();
    }
  }
}

class Row {
  constructor(row) {
    this.row = row;
    this.children = null;
    this.rowObj = {};
    this.filtered = [];
    this.rowIndex = null;
  }

  setIndex() {
    this.rowIndex = this.row.dataset.index;
    return this;
  }

  extractChildren(firstElement = true) {
    let chosenComponentBody, children;
    if (firstElement) {
      chosenComponentBody = this.row.querySelector(
        ".form-group-collapsible-body.clearfix.collapse"
      );
      children = [...chosenComponentBody.children];
    } else {
      chosenComponentBody = this.row.querySelectorAll(
        ".form-group-collapsible-body.clearfix.collapse"
      );
      children = [];
      for (const child of chosenComponentBody) {
        [...child.children].forEach((c) => {
          children.push(c);
        });
      }
    }
    this.children = children;
    return this;
  }

  mapToObj() {
    this.rowObj = this.children.reduce((obj, htmlChild) => {
      const child = new Child(obj, htmlChild);
      obj = child.extract();
      return obj;
    }, {});
    return this;
  }

  filterObjectForData() {
    this.filtered = Object.keys(this.rowObj)
      .filter((k) => {
        const child = this.rowObj[k];
        const doNotInclude = !["type", "content"].includes(child.category);
        return child.hasData && doNotInclude;
      })
      .map((c) => {
        return this.rowObj[c];
      });
    return this;
  }

  createHtmlString(useHR = true) {
    return this.filtered.reduce(
      (s, childRow) => {
        return (s += `<div><strong>${
          childRow.label
        }:</strong> ${childRow.values.join("\n")}</div>\n`);
      },
      useHR ? "<hr />" : ""
    );
  }

  createDivAndUpdate() {
    if (!this.filtered.length) {
      return;
    }
    const checkForExisting = document.getElementById(`ccr-${this.rowIndex}`);
    if (!checkForExisting) {
      const div = document.createElement("div");
      div.id = `ccr-${this.rowIndex}`;
      div.innerHTML = this.createHtmlString();
      this.row.querySelector(".sd-group-button.collapsed").appendChild(div);
    } else {
      checkForExisting.innerHTML = this.createHtmlString();
    }
  }
}

class Child {
  constructor(obj, htmlChild) {
    this.obj = obj;
    this.htmlChild = htmlChild;
  }

  extract() {
    switch (this.htmlChild.nodeName) {
      case "INPUT":
        const [id, category] = this.htmlChild.value.split(",");
        this.obj[id] = {
          category,
          id,
          label: "",
          hasData: false,
          values: [],
        };
        break;
      case "DIV":
        if (this.htmlChild.className === "sd-multi-group") {
          this.isNestedDiv();
        } else {
          this.isNotNestedDiv();
        }
        break;
      default:
        break;
    }
    return this.obj;
  }

  isNestedDiv() {
    const nestedType = this.htmlChild.dataset["sdFieldPath"];
    const curChild = this.htmlChild;
    const divId = curChild
      .querySelector("div:first-child")
      .id.split("dd-field-")[1];
    const curObj = this.obj[divId];
    if (divId && curObj) {
      if (nestedType === "row/column") {
        curObj.label = "Column: 1 (Top) | 2 (Bottom)";
      } else if (nestedType === "row/link") {
        curObj.label = "Link Details Below";
      }
      const nestedRow = new Row(this.htmlChild);
      const rowValues = nestedRow
        .extractChildren(false)
        .mapToObj()
        .filterObjectForData();
      if (rowValues.filtered.length) {
        curObj.hasData = true;
        curObj.values = [rowValues.createHtmlString(false)];
      }
    }
  }

  isNotNestedDiv() {
    const curChild = this.htmlChild;
    const divId = curChild.id.split("dd-field-")[1];
    const curObj = this.obj[divId];
    if (divId && curObj) {
      curObj.label = curChild.querySelector("label").innerText.trim();
      curObj.hasData = !curChild.className.includes("hide");
      curObj.values = this.getValues(curObj.category, curChild);
    }
  }

  getValues(category, child) {
    const divTypes = {
      isSelectValues: ["bgColor", "align", "hr", "target"],
      isBlockValues: ["block", "internal"],
      isTextValues: ["heading", "external", "label"],
    };
    const [type] = Object.keys(divTypes).filter((k) => {
      return divTypes[k].includes(category);
    });
    if (!type) {
      return [];
    }
    return this[type](child);
  }

  isSelectValues(child) {
    return [child.querySelector("select").selectedOptions[0].value];
  }
  isBlockValues(child) {
    return [
      child.querySelector(".chooser-name.asset-chooser-name").innerText.trim(),
    ];
  }
  isTextValues(child) {
    return [child.querySelector("input[type=text]").value];
  }
}

const asyncInterval = async (callback, ms = 200, triesLeft = 300) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      if (await callback()) {
        resolve();
        clearInterval(interval);
      } else if (triesLeft <= 1) {
        reject();
        clearInterval(interval);
      }
      triesLeft--;
    }, ms);
  });
};

const isLoading = () => {
  const busy = document.querySelector(".nprogress-busy");
  console.log("Loading...");
  if (!busy) {
    return true;
  }
  return false;
};

const checkContents = async () => {
  const content = new Content();
  console.log("Checking contents");
  await asyncInterval(isLoading);
  content.addResumeEditingListener();
  const contentRows = content.checkContentsForRows();
  if (contentRows.narrowContentRowNodeList) {
    content.update(contentRows.narrowContentRowNodeList);
  }
  if (contentRows.contentRowNodeList) {
    content.addCollapseListeners(contentRows.contentRowNodeList);
    content.update(contentRows.contentRowNodeList);
  }
};

async function main() {
  await asyncInterval(isLoading);
  console.log("Cascade Page Loaded");
  const menu = new Menu();
  const editButton = menu.checkForEditButton();
  if (!editButton) {
    return;
  }
  editButton.addEventListener("click", checkContents);
}

main();
