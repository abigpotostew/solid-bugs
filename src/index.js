import auth from 'solid-auth-client';
import {createDocument, fetchDocument} from "tripledoc"
import {schema} from 'rdf-namespaces';
import {RDF} from '@inrupt/vocab-common-rdf'


async function getWebId(identityProvider) {
    const session = await auth.currentSession();
    if (session) {
        return session.webId;
    }
    auth.login(identityProvider);
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
    //add vs set. set doesn't work
    amountSubject.addRef(RDF.type, schema.MonetaryAmount) // it is a monetary amount type

    amountSubject.setString(schema.currency, currency)
    amountSubject.setDecimal(schema.amount, amountDecimal)

    console.log("Created",amountSubject.asRef())
    return amountSubject
}

async function deleteAllSubjectsOfType(podDocument, types) {
    const deletedSubjects = []
    types.forEach((type) => {
        podDocument.getAllSubjectsOfType(type).forEach(async (s) => {
            deletedSubjects.push(s.asRef())
            podDocument.removeSubject(s.asRef())
        })
    })

    console.log("saving deletes for ", types, deletedSubjects)
    podDocument = await podDocument.save()
    console.log("saved deletes for ", types, deletedSubjects)
    return podDocument
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

    addButton("1. Create one then delete--Working", async function () {
        let podDocument = await initDocument(documentUrl);
        createAmount(podDocument, 1.0, "USD")
        podDocument = await podDocument.save()
        await deleteAllSubjectsOfType(podDocument, [schema.MonetaryAmount])

        //todo add stuff
        console.log("done create one then delete")
    })


    addButton("2a. Create one", async function () {
        let podDocument = await initDocument(documentUrl);
        createAmount(podDocument, 1.0, "USD")

        await podDocument.save()

        console.log("done create one")
    })

    addButton("2b. Delete All", async function () {
        let podDocument = await initDocument(documentUrl);
        await deleteAllSubjectsOfType(podDocument, [schema.MonetaryAmount])
        console.log("done delete all")
    })
})();