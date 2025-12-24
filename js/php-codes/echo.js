export function handleEcho(concatinatedString, preTemplateContainer) {
    if (preTemplateContainer) {
        preTemplateContainer.innerHTML += concatinatedString;
    }
    else {
        // console.log(concatinatedString);
    }
}
