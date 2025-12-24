export function handleEcho(stringToEcho, preTemplateContainer) {
    if (preTemplateContainer) {
        preTemplateContainer.innerHTML += stringToEcho;
    }
    else {
        // console.log(stringToEcho);
    }
}
