import auth from 'solid-auth-client';
import {createDocument, fetchDocument} from "tripledoc"
import {schema} from 'rdf-namespaces';
import {RDF} from '@inrupt/vocab-common-rdf'


async function getWebId(identityProvider) {
    const session = await auth.currentSession();
    if (session) {
        return session.webId;
    }
    await auth.login(identityProvider);
}

export function getPodFromWebId(webId) {
    const a = document.createElement('a');
    a.href = webId;
    return `${a.protocol}//${a.hostname}/private/tmp/tripledoc-bug.ttl`;
}

async function initDocument(documentUrl) {
    let docOut
    try {
        console.log("fetching pod document at", documentUrl)
        docOut = await fetchDocument(documentUrl);
        console.log("fetched pod document at", documentUrl)
    } catch (err) {
        console.log("creating new pod document at", documentUrl)
        docOut = await createDocument(documentUrl);
        console.log("created new pod document at", documentUrl)
    }
    return await docOut
}

function createAmount(podDocument, amountDecimal, currency) {

    const amountSubject = podDocument.addSubject()
    amountSubject.addRef(RDF.type, schema.MonetaryAmount) // it is a monetary amount type
    amountSubject.setString(schema.currency, currency)
    amountSubject.setDecimal(schema.amount, amountDecimal)
    console.log("Created",amountSubject.asRef())
    return amountSubject
}

function getWebIdFromSubjectId(subjectId) {
    return `#${subjectId.split('#')[1]}`
}

async function deleteAllSubjectsOfType(podDocument) {
    const deletedSubjects = []
    podDocument.getAllSubjectsOfType(schema.MonetaryAmount).forEach( (s) => {
        deletedSubjects.push(getWebIdFromSubjectId(s.asRef()))
        podDocument.removeSubject(getWebIdFromSubjectId(s.asRef()))
    })

}

function addButton(value, clickHandler) {
    let element = document.createElement("input");
    element.type = "button";
    element.value = value;
    element.name = value;
    element.onclick = clickHandler

    document.body.appendChild(element);
}

(async function () {
    const webId = await getWebId("https://solidcommunity.net");
    const documentUrl = getPodFromWebId(webId)

    addButton("1. Create one then delete, reuse doc -- Working", async function () {
        let podDocument = await initDocument(documentUrl);
        createAmount(podDocument, 1.0, "USD")
        podDocument = await podDocument.save()

        await deleteAllSubjectsOfType(podDocument)
        await podDocument.save()
        console.log("done create one then delete")
    })

    addButton("2. Create one then delete, different doc -- BROKEN", async function () {
        let podDocument = await initDocument(documentUrl);
        const amt = createAmount(podDocument, 1.0, "USD")

        await podDocument.save()
        console.log("done create one")

        podDocument = await initDocument(documentUrl);
        await deleteAllSubjectsOfType(podDocument)
        await podDocument.save()
        console.log("done create one then delete")
    })
})();