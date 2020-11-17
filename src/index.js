import auth from 'solid-auth-client';
import {createDocument, fetchDocument} from "tripledoc"
import {schema} from 'rdf-namespaces';
import {RDF} from '@inrupt/vocab-common-rdf'


async function getWebId(identityProvider) {
    const session = await auth.currentSession();
    if (session) {
        return session.webId;
    }

    /* 3. Initiate the login process - this will redirect the user to their Identity Provider: */
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
    //delete all existing items
    const deletedSubjects = []
    types.forEach((type) => {
        podDocument.getAllSubjectsOfType(type).forEach(async (s) => {
            deletedSubjects.push(s.asRef())
            podDocument.removeSubject(s.asRef())
        })
    })

    // the pod respects predicate references.. so by deleting trade, it also deletes the monetary value subjects

    console.log("saving deletes for ", types, deletedSubjects)
    //deletedSubjects.map((ref) => podDocument.getSubject(ref))
    podDocument = await podDocument.save()
    console.log("saved deletes for ", types, deletedSubjects)
    return podDocument
}

function addButton(value, clickHandler) {
    //Create an input type dynamically.
    let element = document.createElement("input");
    //Assign different attributes to the element.
    element.type = "button";
    element.value = value;
    element.name = value;
    element.onclick = clickHandler

    document.body.appendChild(element);
}


(async function () {
    // your page initialization code here
    // the DOM will be available here

    const webId = await getWebId("https://solidcommunity.net");
    const documentUrl = getPodFromWebId(webId)


    addButton("1a. Create one", async function(){
        let podDocument = await initDocument(documentUrl);
        createAmount(podDocument, 1.0, "USD")

        await podDocument.save()

        console.log("done create one")
    })

    addButton("1b. Delete All", async function(){
        let podDocument = await initDocument(documentUrl);
        await deleteAllSubjectsOfType(podDocument, [schema.MonetaryAmount])
        console.log("done delete all")
    })

    addButton("2. Create one then delete--Working", async function(){
        let podDocument = await initDocument(documentUrl);
        createAmount(podDocument, 1.0, "USD")
        podDocument = await podDocument.save()
        await deleteAllSubjectsOfType(podDocument, [schema.MonetaryAmount])

        //todo add stuff
        console.log("done create one then delete")
    })


})();