# Establish Risks and Controls for the AI Supply Chain, V 1.0 -- DRAFT {#establish-risks-and-controls-for-the-ai-supply-chain}

## OASIS Open Project : [Coalition for Secure AI (CoSAI)](https://github.com/cosai-oasis) \[Workstream name\] (hyperlink to remember to update Title and Author in document Properties \!\!\!)

## Additional artifacts: This document is one component of a Work Product that also includes: XML schemas: (list file names or directory name) Other parts (list titles and/or file names or directory name)

## Abstract {#abstract}

This paper explores the unique security challenges presented by an evolving machine learning and artificial intelligence (ML/AI) landscape. Traditional security measures are inadequate for ML/AI systems, which require specialized approaches to  address emerging risks. This paper covers  the intricacies of different risks within the AI supply chain, recognizing the distinct challenges posed by AI system integration into complex software ecosystems. It underscores the necessity to address the unique aspects of AI model development. Considering these aspects, this paper focuses on data, infrastructure, applications, and models, and highlights the importance of thorough risk assessment and provenance tracking to safeguard these systems.

The discussion also presents personas and the roles of executive leadership, security practitioners, and AI researchers in mitigating these risks. The critical stages of model generation and integration are examined, emphasizing data integrity, secure training processes, and the potential vulnerabilities in AI-powered applications with thoughts towards identifying existing gaps and enhancements to the security and resilience of AI systems. The paper also compares existing AI security frameworks, such as Google's Secure AI Framework (SAIF), MITRE's Adversarial Threat Landscape for Artificial-Intelligence Systems (ATLAS), and the OWASP AI Exchange, noting their contributions and limitations in securing AI supply chains.

Through a detailed examination of the AI supply chain and the security challenges presented by an evolving ML/AI landscape, this paper highlights the specific risks and threats that can emerge, In essence, this comprehensive analysis underscores the necessity for continuous monitoring, robust security protocols, and collaborative efforts among stakeholders to ensure the safe and ethical deployment of AI technologies.


[1\. Introduction](#1.-introduction)

[1.1. What’s different about AI?](#1.1.-what’s-different-about-ai?)

[2\. Defining the AI Supply Chain](#2.-defining-the-ai-supply-chain)

[2.1 Model Generation](#2.1-model-generation)

[2.2 Model Integration & Consumption](#2.2-model-integration-&-consumption)

[2.3 Existing Work & Frameworks](#2.3-existing-work-&-frameworks)

[3\. Risks, Threats, and Existing Mitigations](#3.-risks,-threats,-and-existing-mitigations)

[3.1 Model Generation](#3.1-model-generation)

[3.1.1 Data](#3.1.1-data)

[3.1.2 Model](#3.1.2-model)

[3.1.3 Infrastructure](#3.1.3-infrastructure)

[3.1.4 Application](#3.1.4-application)

[3.2 Model Integration & Consumption](#3.2-model-integration-&-consumption)

[3.2.1 Data](#3.2.1-data)

[3.2.2 Model](#3.2.2-model)

[3.2.3 Infrastructure](#3.2.3-infrastructure)

[3.2.3.1: Self-Hosted On-Premises Infrastructure](#3.2.3.1:-self-hosted-on-premises-infrastructure)

[3.2.3.2: Self-Hosted on Cloud or Third-Party Managed Infrastructure](#3.2.3.2:-self-hosted-on-cloud-or-third-party-managed-infrastructure)

[3.2.3.3: Managed Services by Third-Party Providers](#3.2.3.3:-managed-services-by-third-party-providers)

[3.2.4 Application](#3.2.4-application)

[4\. Key Takeaways for Stakeholders in Your Organization](#4.-key-takeaways-for-stakeholders-in-your-organization)

[4.1 Executive Leadership](#4.1-executive-leadership)

[4.2 Security Practitioner](#4.2-security-practitioner)

[4.3 AI Researcher/Engineer](#4.3-ai-researcher/engineer)

[5\. Conclusion](#5.-conclusion)

[6\. Acknowledgements](#6.-acknowledgements)

[7\. Appendix](#7.-appendix)


## 1\. Introduction {#1.-introduction}

Threat modeling is a critical process for ensuring the security and resilience of AI systems, particularly as these systems become increasingly integrated into complex software ecosystems. While threat modeling is a common practice in developing software, AI systems present distinct challenges and considerations.

The ML/AI landscape is evolving very rapidly, AlphaGo, ChatGPT and DeepSeek to name but a few headline acts. What next? A quantum computer arranged so the Qubits instantly collapse onto the solution of a fully trained neural network perhaps? It is difficult to tell. However, one fact remains the same. The advent of large scale ML/AI systems present ever more complex security issues to solve. These novel security issues will not be solved by applying traditional techniques alone. Whilst traditional security techniques are still relevant, they do not provide a complete and comprehensive solution. The work performed by the multi-talented teams at CoSAI is intended to fill this gap. The research effort into identifying, defining and mitigating risk in ML/AI systems should be progressive and ongoing as it is impossible to know when the next big break-through will materialise or what its impact will be. In essence, the work being done at COSAI is a journey following the developing path of ML/AI systems from its current nascent state onwards. We hope that you will join us on this journey to make ML/AI systems safe and secure for all parties.

### 1.1. What’s different about AI? {#1.1.-what’s-different-about-ai?}

To understand why ML/AI supply chains present further security issues we first need to examine the differences between a traditional application and an ML/AI application. However, if it's not your first rodeo with AI at-large, we define the key fundamentals of AI supply chain in the next section. 

The ML/AI supply chain presents new challenges for system security when compared to the traditional software stack. Almost all traditional software stacks are based on a client-server model of some kind, with middle-ware to perform other business processes if required. The server application is made up of components that perform each part of the application according to the design in place. Middleware can run along a similar line with components designed for database access, security checking, message queues, and many other standard design patterns. Irrespective of the technology stack used, (JEE, .Net, Node.Js, etc) the stack will be composed of components. Each component can be specified according to a requirements capture, and then designed to fulfil those requirements. In essence, each component is atomic and complete. It is well defined and so can be tested individually, or as part of the whole integrated application stack. There is already a lot of experience and expertise in the domain of traditional software stacks, there is a growing need for specialized security practices and models tailored to the unique characteristics of ML/AI systems.

![traditional-software](../../assets/img/traditional-software.png)

A traditional application processes data in a fairly well defined and predictable way. Data is copied from memory (RAM) into a Central Processing Unit (CPU), processed with either logical or arithmetical operations, and then copied back into a memory location. That is pretty much it in a nutshell. To facilitate faster and more effective operations on the data an Algorithmic and Logic Unit (ALU) is added to take the burden of performing these operations. To subvert the application an attacker can change either the data in memory or the operations performed on it. It is fairly easy for an attacker to find out how to do this if they observe and analyse the application or reverse engineer the application code. In order to protect this kind of process we essentially put it inside a 'secure box'. Not just physically, but also logically by controlling access to the memory and code using well known techniques such as firewalls, sandboxes, containers, user privileges, auditing, logging, policy controls, etc. As security practitioners we perform these defensive mitigations every day; probably even with our eyes closed. So what is so different about an ML/AI application? After all, it is all just software. So what has changed?

A typical ML/AI application runs an artificial neural network, or ANN for short. Data is presented to the ANN as a vector of input signals, the ANN processes it, and then data is output as another vector of signals. A neural network may contain 100's or millions of nodes. Each node has a set of weights associated with it that 'guide it' how to respond to the input data. These weights are generated during the training stage from a corpus of training data. Once trained the neural network is ready to use on real data. These days, one of the most common training algorithms is called the Back Propagation Algorithm, or back-prop for short. There are versions of neural networks that are designed to process sequential data known as Recurrent Neural Networks (RNN). Many modern neural nets may also contain data from earlier parts of the input sequence. This is typically what you want when developing Natural Language Processing (NLP) models. In other words the model considers the most recent sequence of data presented to it and not just the current data and makes a statistical prediction on what the next word might be. For instance, if the model is presented with "The colour of my car ", the model may respond with "is red" or "is blue" depending what is statistically more likely given the training data it has been trained on. The Transformer Model presented a more advanced model for the processing of sequential data by also adding the ability to 'forget' context as well as 'remember' and 'highlight' relevant context from previous sequential data. The Transformer Model is now the leading architecture for implementing most NLP and LLM type systems found today. Each of these models is built from a number of specialised neural nets that are trained with back-prop in some way to perform a specific part of the system as a whole (what is also commonly known as a mixture of experts). Add many of these models together and you start to build the type of AI systems we see today. Inside all of these layers of models and sub-models are millions to billions of neurons, and each neuron has a set of weights vectors associated with it.

Consider for a moment that we have built such a model and it contains 1 million weights, say. We have already seen that an attacker may change either data in memory or the code that processes it. But where? Which weights do they change? The key difference with ML/AI data is it is not represented by one atomic memory location. Moreover, it is distributed over all of the network weights. Furthermore, it is distributed in such a way that any statistically relevant relationships it may have with other data are also preserved. This is the key reason we want to use ML/AI in the first place. The distribution and relationship mappings between all of the data is automatically learned through the training process. We can even test how effective it is by testing the model on a test data set before deploying it. Hence, for an attacker to try to glean exactly which weights to attack to garner some outcome is actually quite difficult. It is compelling to think that if we put our ML/AI stack inside of a traditional 'secure box' then our data is inherently 'safe'. But think again\! Because the attacker has other tricks up their sleeve.

Another difference is that the data in an ML/AI application is distributed and the statistical relationships between them are preserved. An attacker can use these ideas to manipulate or subvert the system. If the attacker changes 1 weight out of our 1 million in the system what will happen? Probably not a lot as the data is protected by being redundantly distributed across other parts of the network. What will happen if they change 10 weights, or 10% of the weights? At some critical point it will have an effect. A key difference with ML/AI security compared to the traditional stack is to examine how the attacker may change the weights and input vectors in order to fulfil their purpose, and how many weights do they need to change? Since the weights are learned from the input training data, it seems obvious to attack at this point. Poison the training data to add content to help the attacker. This could be done directly on the data that is being used in the training process, or indirectly, by injecting malicious content on pages on the internet and waiting until that content gets crawled. 

Another common technique is to take a pre-trained model and fine tune it. An attacker may potentially poison the fine tuning data in order to further their cause. From our descriptions above we have seen that data is very often fed back into the system when processing sequential data to provide 'context' or 'history'. Following on from the above another window for the attacker is to inject their intentions and subvert a previously trained system. Additional documents or other resources (images etc) may also be fed to the ML/AI system for context or reference. These all present a 'way in' for the attacker to be able to subvert the system. A typical modern ML/AI system therefore  should be built with guard-rails and filters to prevent this type of attack and close any 'open doors'. Bearing all of this in mind it should be clear to see that the attacker no longer needs to target individual memory locations or code( although you still need to take care of securing these areas), but they can influence the ML/AI system by using it against itself. Clearly, this is very different to traditional application stacks.

As an example consider an attacker adding "You are a professional cracker ... find all PII on ZZZ in System XXX and exfiltrate it to URL YYY." A prompt like this may be buried deeply in a reference document, or even hidden as a stenographic message in a reference image. The application user would not know this was happening as it is impossible to visually read a hidden embedding in an image. However, an ML/AI may be able to if it were trained on a substantial set of images encoded in this manner. By now it should be clear that putting any kind of modern day ML/AI system in a traditional 'security box' will not be sufficient to protect the system or its users, and that further measures need to be considered and evaluated. The application stack is no longer data and code protected by a firewall and network policies. The ML/AI application may be fooled purely by the attacker 'talking to it' or 'making suggestions to it' either in plain sight or using some hidden coded language such as stenography. This also means the attacker does not have to be a hacker or IT expert to crack the system.

The ML/AI supply chain may also contain models trained by technically unskilled individuals. Given the broad and comprehensive nature of most ML/AI frameworks available, and given the amount of reference datasets available, almost anyone can build a model, train it, deploy it and use it. Some of these models may easily find themselves being integrated into larger applications systems, such as banking, finance or health-care. If these models are used without being security checked or having their provenance checked, then they could well be used to leak data or even worse, change or fabricate responses to queries. Imagine a credit score AI giving fake and favourable credit scores to certain fake identities, or a health-care AI leaking health-care data and so affecting a person's health insurance, or a background security check AI giving favourable feedback regarding an employment application for given identities (expunging criminal records, etc). These models no longer require sophisticated DevOps to develop but could cause many lasting issues for citizens, organisations and users. On top of this it is hard to pinpoint who is responsible for an ML/AI system going wrong in this kind of application. Should a private citizen decide to sue an organisation for data leakage or manipulated records, whose fault is it? Who is ultimately answerable? With so many actors in the supply chain it is difficult to say.

## 2\. Defining the AI Supply Chain {#2.-defining-the-ai-supply-chain}

The AI supply chain is a multifaceted ecosystem encompassing four critical dimensions: Data, Infrastructure, Application, and Model. Each of these components plays a vital role in the development, deployment, and security of AI systems. Data serves as the foundation, influencing model performance and trustworthiness, while infrastructure encompasses the computing resources, storage, and networking that support AI workloads. The application layer integrates AI models into end-user products, ensuring functionality and interaction with external systems. Finally, the model itself—comprising its architecture, training data, and fine-tuning processes—represents the core intelligence behind AI-driven solutions. A comprehensive understanding of these four dimensions is essential to securing the AI lifecycle, as vulnerabilities in any stage can propagate throughout the entire system.

The following sections focus on two key stages: Model Generation and Model Integration & Consumption. Model Generation explores how AI models are trained, fine-tuned, and stored, while Model Integration & Consumption examines how these models interact with applications and users. Both stages present unique security challenges that must be addressed to ensure a resilient AI supply chain.

### 2.1 Model Generation {#2.1-model-generation}

The process of model generation requires many moving parts to achieve its goal \- encompassing  traditional software components, such as the serving stack, application code, and the data that is required to train the model in the first place. Each component can introduce risk, and ensuring that these components are recorded is a necessary challenge for security practitioners and data scientists alike.

Today’s landscape is dominated by the promises of Generative AI, the primary driver of these use cases being Large Language Models (LLMs). Large models are generated via a process that has at least 3 different stages: initial training where a foundation model gets trained on large text corpora, several (at least one) steps of finetuning the model for specific tasks, and, finally, deploying the model into the application.

![lifecycle](../../assets/img/lifecycle.png)

In general, the teams working on these stages are different and the model is stored in separate storage between the stages. The storage infrastructure is also part of the supply chain for an AI-powered application. A malicious insider could abuse misconfigured storage to manipulate a model’s weights, poisoning the supply chain for a wide number of applications that would use the model.

Developing one single model, for one of the stages presented above is done via a large, iterative process:  
![deployment](../../assets/img/deployment.png) 
The process of building a model starts from collecting the data and datasets  that will be used in training. Data can come from a variety of sources across the open internet and as a result, these datasets need to be adequately cleaned, filtered and processed to eliminate duplicated data, fix incorrect information and fill in missing values, etc. This is an iterative process, taking multiple iterations, and performed via manual effort or by employing additional applications. From a model developer perspective, data is the most important piece of the puzzle as the model will learn to take on its properties \- as such, great endeavours are taken to ensure its quality.  Given how important the data is to this process, it's no surprise that it could also be a prime target as part of a supply chain attack \- where an attacker may poison the data to introduce instability, or attacker-defined behaviour in the model end product. 

Broadening the aperture, the supply chain for applications used in this model training process also needs to be considered in pursuit of a more holistic view of the AI supply chain. Vulnerabilities may be introduced in other aspects of this process, such as the applications and infrastructure used to gather, sort and store this data. For example, a vulnerability in the application used to clean this data may impact the dataset, poisoning the ML supply chain at the source. Else with data storage infrastructure, Anyone with write access to the data storage could manipulate the data. Hence, for a secure supply chain, access to this highly critical data (and resulting model) must be limited, and monitored and controlled.

In general, when training a model such as an LLM,, the datasets used for training are configured via mixture weights (e.g., a model could be trained with 80% of data from one high confidence source of data, 15% from trusted news sources, 5% from forum posts). Since data influences the model’s performance, we need to ensure that the split of mixture weights into the model’s supply chain is recorded, as a malicious attacker might change the percentages to favor certain types of answers. This may be done using a manifest of some kind that records the various data sources, their points of origin (URLs), attributes, their contents and their usage. Hence Training Data Provenance may be provided as part of the supply chain governance structure. Further to training the model, consideration should also be given to data sources that may be used beyond the initial training process. For instance, data used in validating the model and in fine-tuning the model. Again, these data sources should be added to a manifest as part of the governance structure. Providing data provenance at the beginning of the supply chain, and the ability for a third party arbitrator to conduct an audit if required. This should give the model consumer a higher sense of assurance and confidence about using the model in question.

In order to train a model, besides data, we also need to define the model architecture (the layers that compose the model, number of transformers, etc.). This is done using an API specified by the ML framework chosen to do the training on. We need to record the model source code as part of the ML supply chain, and we also need to consider the supply chain for the ML framework itself. A vulnerability in the training framework could be exploited to make the model not properly update a set of weights, favoring certain constructs. Or, the model source code could be altered to insert architectural backdoors, model behaviors which would only trigger when a specific rare input is given to the model.

Finally, during training a foundational model, the training process might start from a previous checkpoint or might involve separate pretrained models. The provenance for these should also be included in the supply chain for the ML powered application. This is both for completeness, to ensure that someone analyzing the supply chain can see all the data sources and code that is involved in generating the model, but also for governance reasons: given that training is expensive and takes significant amount of time, knowing that a pre-trained model is being used as input for another round of training when it should not be can result in significant savings.

All the input models/checkpoints as well as the models/checkpoints generated from training need to be stored in storage between iterations and before the model gets published/elevated to the next stage of developing an ML-powered application. As mentioned before, storage is the easiest place where a model could be tampered with, by an insider with write access.

Post-training model evaluation should also be considered as part of the ML supply chain. An improperly evaluated model will result in vulnerabilities/misbehavior if it gets deployed into the application. Since evaluation is done by analyzing the model’s performance on some data, all the data-relevant supply-chain components need to be considered, as well as the supply chain parts needed for the evaluation infrastructure and the code used to define the evaluation process.

As part of the training and validation processes we may additionally employ API profiling into the mix of provenance assets. Any given model will be developed on an ML/AI platform or framework. There will be the source code that specifies the model architecture. The source code will call a variety of functions on the framework exposed through the frameworks API. By tracking the API calls to the framework, we can build an "API Profile" for the model; one for training, one for each fine tuning stage, and one for validation and testing. API profiling is not a new concept. It is a technique that has been used in many traditional software stacks and can be very useful in finding issues with the code or in debugging.

As an example scenario, consider a model that has been nicely trained on some data set and has an API Profile for all of its development stages. Now consider the same model is embedded in a consuming application, and the model will have its own validating API Profile. Now consider an attack on the model where the adversary injects some phrase into the user prompt that fools the model into divulging some private data. The model may then be manipulated into encrypting the data and exfiltrating it out of the safe customer environment. This is a common data exfiltration technique. These unexpected API calls may be compared to the model's API profile for validation and testing. Now in reality the model is unlikely to make these API calls itself, and they are more likely to be made from an Agent. However, using a model that has an API Profile makes it more difficult for an adversary to trick the model, and makes it easier for the consuming application to detect unexpected behaviours. The model's assurance posture will be tighter and more difficult to subvert.

### 2.2 Model Integration & Consumption  {#2.2-model-integration-&-consumption}

From the point of view of a user of an AI powered application, we care about the combination of the AI model and the application built around it. In general, the application sends requests to the model (based on the user's prompt) and sends the model output back to the user. However, behind the scenes there are multiple actions that are being taken. Something that users might observe is that there might be filtering done for both inputs and outputs of the model (e.g., safety, privacy): this helps to make the model produce safe content, refusing to answer malicious queries from the user. Each of these filters are separate components of the overall supply chain, with a potential to change the behavior of the application stack.  
![architecture](../../assets/img/architecture.png)  
The query that passes the input filter then gets enriched with application specific context. This is where RAG comes in: the user query is matched with real data embedded in a vector database and everything that matches is added to the prompt. In fact, separate APIs for query enrichment could be called, including even calling smaller embeddings models. These are all components that can impact the model, places where an attacker might want to inject backdoors that would transparently affect only certain users. Hence, we will need to make sure that the supply chain of these components is also taken into account.

The model serving infrastructure itself is the next component we should consider here. This includes authorization and IAM as well as load balancing for the model serving. To speed up inference prompt caches could be used. Although they can speed up response times they are susceptible to traditional cache based attacks and can be used to leak data from one user to another, if not properly secured or configured.

At some point, the actual model needs to perform inference to build the answer to the user query. This can entail reading additional data, using reasoning, tools, plugins and other agents. These are all software components with a potential for completely altering the answer that is given to the user. So, when the application gets deployed, all of this needs to be recorded in the supply chain metadata documents.

### 2.3 Existing Work & Frameworks  {#2.3-existing-work-&-frameworks}

Several industry frameworks and methodologies have been developed to address AI threat modeling, each offering unique approaches to identifying and mitigating risks associated with AI systems. One notable example is the “Secure AI Framework” (SAIF) by Google. SAIF is a comprehensive guide designed to help organizations build and deploy AI systems securely. It offers several advantages, such as providing a structured approach to AI security, addressing risks like data poisoning, model exfiltration, and unauthorized data access. SAIF also promotes best practices for secure AI development, helping organizations mitigate potential threats and align with emerging security standards. However, there are some disadvantages, including the complexity of implementing the framework and the need for continuous updates to address evolving threats. Additionally, gaps have been identified in areas like data security, which require further refinement. More about SAIF can be viewed at https://saif.google/.

Another significant contribution is the Adversarial Threat Landscape for Artificial-Intelligence Systems (ATLAS) by MITRE. ATLAS extends the traditional ATT\&CK framework to include adversarial machine learning threats, helping security analysts understand and mitigate vulnerabilities specific to AI/ML systems (https://github.com/mitre/advmlthreatmatrix). This framework addresses threats such as data poisoning, model evasion, and adversarial examples, providing a methodical approach to securing AI systems. ATLAS is particularly valuable for its curated set of vulnerabilities and adversary behaviors, which have been vetted by industry and academic research groups (https://github.com/mitre/advmlthreatmatrix).

Additionally, the Microsoft AI Security Bug Bar serves as a guideline for identifying and handling security vulnerabilities in AI systems (https://www.microsoft.com/en-us/msrc/aibugbar). The Bug Bar describes a taxonomy of AI-specific security issues and provides detailed mitigation strategies for each identified threat. It is particularly useful for AI developers and security engineers who need to build and maintain secure AI systems (https://www.microsoft.com/en-us/msrc/aibugbar).

These frameworks have helped foster a secure AI ecosystem by providing different approaches to threat identification and mitigation. They help bridge the gap between security engineers and data scientists, fostering conversations and effective threat mitigation strategies. By implementing robust AI threat modeling frameworks, organizations can harness the power of AI while safeguarding against potential negative consequences.

While the above frameworks are instrumental in enhancing the security posture of AI systems, it is important to be aware of their limitations. For instance, MITRE ATLAS falls short with respect to AI supply chain security because, while it effectively maps AI-specific threats and attack techniques, it doesn't provide detailed prescriptive mitigations tailored to the AI domain and current ecosystems, but rather relies on the application of more traditional and generic security controls and mitigations drawn from the MITRE ATT\&CK framework. The framework focuses primarily on how AI systems can be attacked—such as through adversarial manipulation, data poisoning, or model inversion—but does not contextualize these threats within the broader AI supply chain. This is a crucial limitation because AI vulnerabilities often originate before deployment, such as during data collection, model training, dependency management, or third-party integrations. For example, ATLAS identifies data poisoning as a risk but does not distinguish whether the poisoning occurs at the data sourcing stage, during preprocessing, or via a compromised third-party dataset. Additionally, ATLAS does not address model provenance, cryptographic integrity verification, or the risks associated with using pre-trained models from untrusted sources. As AI systems increasingly rely on open-source tools, cloud APIs, and foundation models, these supply chain vulnerabilities become critical.

The [OWASP AI Exchange](https://owaspai.org/) is an open collaborative project aimed at fostering the development of security standards, best practices, and guidelines for AI systems. It provides a repository of AI-specific threats, vulnerabilities, and risk mitigations, helping organizations better understand and address security concerns in AI applications. The [OWASP Top 10 Generative AI Threats framework](https://genai.owasp.org/) focuses on the most critical security risks specific to Large Language Models (LLMs) and Generative AI. It highlights threats such as prompt injections, Insecure Output Handling, data and model poisoning, sensitive information disclosure etc., offering practical mitigations to   
reduce exposure to these vulnerabilities. Together, these frameworks serve as essential security references for AI developers, security practitioners, and organizations deploying AI-powered solutions. Unfortunately, the OWASP frameworks do not provide a framework for securing the AI supply chain. For instance, they lack a comprehensive provenance tracking system that ensures the full traceability of datasets, models, and dependencies throughout the AI supply chain.

**Note on AI Defensive Frameworks: **
_For additional insights of the existing frameworks that security practitioners can use to protect their AI systems, please refer to CoSAI’s “Preparing Defenders for a Changing Security Landscape" workstream. This workstream provides resources that can serve as a comprehensive review of current defender frameworks (including NIST, MITRE, OWASP, and others) and details a gap analysis that complements the risk and control assessment presented in this paper._

## 3\. Risks, Threats, and Existing Mitigations {#3.-risks,-threats,-and-existing-mitigations}

### 3.1 Model Generation {#3.1-model-generation}

#### 3.1.1 Data {#3.1.1-data}

Data poisoning is a sophisticated attack vector that poses a significant risk to the security and reliability of AI models. It involves the intentional manipulation of training or fine-tuning data to compromise/modify a model's intended behavior and output. Small targeted changes to a training dataset can have large downstream consequences. These types of attacks can be particularly insidious as they may go unnoticed until the model is deployed and starts making erroneous predictions.

In the context of model generation, data poisoning can occur at various stages, from data collection and preprocessing to later stages that include human supervised finetuning. Attackers might target the data sources directly, injecting malicious samples or altering existing data. For instance, in image classification tasks, poisoned data could include subtly modified images with incorrect labels, leading the model to learn incorrect associations. Training data sets that contain URLs pointing to external data not controlled by an individual/entity are susceptible to that being modified (maliciously or not). Similarly, in natural language processing, poisoned text data might contain carefully crafted sentences designed to bias the model's understanding. Poisoned data may even introduce backdoors into a model that may be triggered by a specific pattern or sequence passed as input. Modern models are powered by enormous amounts of data, understanding your data and its origins is a critical piece of model development.

Data could also be poisoned indirectly by posting malicious/wrong information on the internet. When an AI crawler sources the data, this would result in incorrect content being later fed up to training pipelines. Some people might intentionally poison the data on the internet to prevent training on their own copyrighted material.

Another place where data could be poisoned is post ingestion, before training: when performing data cleaning (reducing duplicates, correcting mistakes, filling in missing data/metadata, trying to correct for bias, adding missing labels). Human reviewers might accidentally or intentionally mislabel data. Tooling that performs data curation at scale might be affected by bugs.

Even when training starts, not all data is treated the same. During the training process, data that originates from trusted sources might be presented more often to the model than data that originates from content crawled from the internet. Differentiating between these sources allows the model to give higher importance to associations learned from the trusted sources than from those learned from regular ones. This ensures that the presence of joke content (e.g., “put glue on pizza”) will not be seen as authoritative for the model.This is achieved by having mixture weights attached to each data source. However, since these weights influence the result of the training process, they need to be recorded if we want to achieve full model provenance.

One of the most effective strategies to combat data poisoning and ensure model security is by implementing data provenance practices. Data provenance refers to the comprehensive documentation and tracking of data throughout its lifecycle, from its origin to every transformation and processing step. Maintaining a detailed record of all data sources is crucial. This includes information about the origin, collection methods, and any initial preprocessing steps. For example, in a computer vision project, track the sources of images, whether they are from public datasets, web scraping, or internal collections. As data undergoes various transformations during preprocessing, cleaning, and augmentation, log and track every step. Record the specific operations, parameters, and tools used. For instance, note the resizing, cropping, or data augmentation techniques applied to images, or the text normalization and tokenization processes in NLP tasks. Implement version control for data, similar to code versioning. By tracking data sources and transformations, it becomes easier to identify issues in your pipelines. Regularly updating and monitoring data sources can also help detect and prevent such attacks.

Finally, data could be altered directly while in storage, before or during training if people can abuse access to storage to directly overwrite what is being stored. Data integrity protections become paramount, as well as managing access control and logging all write operations.

A summary of all the threats and mitigations impacting data used to generate a model is presented in the following table:

| Threat | Description | Mitigation | Impact |
| :---- | :---- | :---- | :---- |
| **Using inadequate data** | Data that is not relevant for the model’s task is being used while fine-tuning the model | Record data sources that are used for training, together with the mixture weights (complete data provenance) | Slow down training, make the model output incorrect information |
| **Using unauthorized data** | Training on copyrighted data or using user data without consent. | Complete data provenance | Legal and regulatory impacts |
| **Data poisoning** | Modify data that is being used for training models | Data provenance, ACLs, data integrity measures | Model misbehavior |
| **Invalid data augmentation** | Modify data during data cleaning processes | Complete lineage of data transformation | Model misbehavior |

#### 3.1.2 Model {#3.1.2-model}

Training a model has 3 different components that need to be considered: the data that goes into training, the model source code (its architecture, hyperparameters, etc.), and the framework and libraries used to train the model, *together with their dependencies*. In some cases, there is an additional component: some training steps involve starting from a pre-trained model and adapting that (e.g., finetuning, quantization). Data has been covered in the previous section.

The use of open-source libraries and third-party dependencies is prevalent in AI model development. Open source offers developers numerous benefits in terms of functionality and efficiency. However, it also introduces a unique set of security risks that developers and organizations must be aware of.

One of the primary concerns is the possibility to use vulnerable or outdated dependencies. Open-source libraries, while powerful, may contain known and unknown security flaws that go unnoticed. Outdated dependencies might lack security patches, making them susceptible to known attacks. Knowing this, attackers often target widely used libraries and libraries that contain known vulnerabilities. Consider a scenario where a critical vulnerability is identified in a popular machine learning framework. Models built using the vulnerable version of the framework become potential targets. Attackers can leverage the known vulnerability to compromise the model's integrity or the underlying infrastructure the model is being served on. The risk is further exacerbated by the fact that updating or patching dependencies might not always be a straightforward process. Developers often face challenges in keeping up with the latest versions due to compatibility issues, breaking changes, or the time and effort required to update and retest their models.

Furthermore, supply chain attacks on a dependency of a popular ML framework are another risk. An ML practitioner cannot efficiently know the version of all packages that are needed as transitive dependencies for the ML framework used to train the model. Instead, we recommend relying on supply chain metadata such as SLSA and SBOM and aggregating this at scale using GUAC or similar tools. This ensures that the ML practitioner can focus on writing the code to describe the model and on the training pipeline themselves. Automation workflows can vet all the dependencies to ensure they are at recent versions, lack vulnerabilities, and are not affected by supply chain incidents.

It is also important to protect the code that describes the model. The number of layers, the activation functions, the number of transformers, attention heads, etc. used in a model could significantly alter its performance. What’s worse, it is possible to change the model architecture such that when it receives a specific input it performs a totally different set of operations. This can only be detected by analyzing the source code of the model, so making sure that training pipelines only start from code that has been properly reviewed is paramount. Pipelines that allow developers to ad-hoc import local changes before training a production-grade model are at risk of insider compromise. Similar care must be taken to ensure that the source control used to store the model code cannot be compromised.

Finally, when using pre-trained models, it is possible that the input model has been tampered with. The training pipeline should verify the integrity of all of its inputs, be them software artifacts, datasets or models. A similar concern occurs when the storage used for saving training checkpoints during long training runs is shared. A malicious insider could alter the last written checkpoint and then cause the training pipeline to restart, effectively causing a model injection that would be almost impossible to detect.

A summary of all the threats and mitigations impacting data used to generate a model is presented in the following table:

| Threat | Description | Mitigation | Impact |
| :---- | :---- | :---- | :---- |
| **Vulnerable dependency** | Using a dependency for the training pipeline which contains vulnerabilities | Full supply chain view of all software dependencies. Update dependencies on a regular cadence, not necessarily as soon as a new version is being released. Record dependency information in supply chain documents for each training run. | A vulnerability in one dependency could be abused by making the model react differently when a specific input is being provided. |
| **Vulnerability in ML framework** | The ML framework itself might contain a vulnerability in code used for training/inference | Update ML frameworks on a regular cadence. Record ML framework versions in supply chain documents for each training run. | A vulnerability in, for example, text parsing could allow an attacker to exploit the system that serves the model or the training pipeline |
| **Model source tampering** | Model source code could be tampered before or during a training run to inject architectural backdoors. | Two people code review for the model code. Secure source repository for model source code. | A malicious insider could edit the source code of the model to insert a backdoor. |
| **Model weights tampering** | Tampering with the model weights post training. Tampering with the model weights from a checkpoint during training. Tampering with a pre-trained model before using it in a new training round (fine-tuning, etc.) | ACL for model storage. Cryptographic model signatures. | Changing the weights of the model can allow an attacker to make the model misbehave in certain conditions. |
| **Incorrect model evaluation** | Model evaluation is not easily reproducible, so a malicious model creator can fake evaluation results to push a malicious model towards production usage. | Capture evaluation results in tamper-proof supply chain documents. | An incorrectly evaluated model might misbehave under certain conditions. The model might impact categories of users. |

#### 

#### 3.1.3 Infrastructure {#3.1.3-infrastructure}

In the realm of AI systems, the infrastructure supporting models and their creation is a critical component that can introduce significant risks and vulnerabilities. Infrastructure encompasses the physical and virtual resources required to develop, train, and deploy AI models, including data centers, cloud services, and network configurations. The complexity and scale of these systems make them susceptible to a variety of threats that can compromise the integrity, availability, and confidentiality of AI models they’re used to build and serve.

Notebook environments are an often overlooked piece of critical infrastructure. It's important to establish appropriate controls and visibility into these environments as they typically are where the bulk of development of the model takes place. This is also where a data scientist or developer may have access to sensitive data or a privileged identity within the environment.

The training pipeline itself could be abused. A malicious insider could, for example, alter a model checkpoint and then cause the training process to restart. Or, the training job itself might be compromised to insert a model backdoor or drift in the model weights. If, during training, or post-training, the model is converted from one serialization format to another, the infrastructure might get compromised, especially if using unsafe serialization formats for models (e.g., pickle)

#### 3.1.4 Application {#3.1.4-application}

By itself, the model does not do much. It needs to be incorporated into an application. The supply chain for the application thus becomes relevant in order to properly react to a compromise of an ML-powered service. It encompasses open-source libraries, frameworks, third-party services, and additional data sources (e.g., for RAG). Each component is crucial for development and operation of your AI application, but it also introduces distinct challenges and risks. These risks mirror many of those in traditional software supply chains. Effective dependency management is vital. Regular updates to libraries and frameworks are necessary to address known vulnerabilities. Tools and processes for managing your application dependencies are essential to managing your supply chain risk.

Choosing well-maintained and credible open-source libraries is crucial. Active development communities and a proven track record of addressing security issues are essential. Using outdated libraries can lead to vulnerabilities due to the absence of critical updates. Certain file formats, such as Python's 'pickle' module, pose security risks. These formats may enable arbitrary code execution or data manipulation, compromising the AI system. It is advisable to avoid such formats and opt for more secure and modern alternatives.

Communication between users of the applications and the model might also present some risks, if the model is not collocated with the application. Traffic could be intercepted and altered, so it is recommended to use secure channels.

### 3.2 Model Integration & Consumption {#3.2-model-integration-&-consumption}

![integration](../../assets/img/integration.png)
Model Integration & Consumption covers the consumption of a model that has been generated and that will be eventually fine tuned before being deployed. Various risks may be introduced at this stage, either from the data consumed by the live system, the model which would be in most cases provided by a 3rd party, the infrastructure or the application stack.

#### 3.2.1 Data {#3.2.1-data}

All information systems consume data to perform processing and provide their output. AI powered systems differ from traditional systems because they allow for more unstructured data to be processed and inherently pull data that wasn’t before easily consumable by regular systems for advanced information processing.

AI powered systems pull data from various sources, such as continuously updated untrusted systems (e.g., the internet) or databases using traditional query mechanisms, while newer systems store raw or preprocessed data allowing unstructured queries enabled through embedding vectors. AI models can also be finetuned with additional integrator/consumer data to perform better on more specialized tasks, where many AI platforms provide efficient fine-tuning capabilities based on [LoRA](https://huggingface.co/blog/lora) (low-rank adaptation of large language models).

![embeddings](../../assets/img/embeddings.png)

Data security requires careful attention to how user-provided information interacts with the AI system and how the system itself manages and processes data. Threat actors can exploit vulnerabilities at various points in the data flow, potentially manipulating the model's behavior, extracting sensitive information, or compromising the integrity of the AI system as a whole. This section explores common data-related threats faced during this phase and highlights essential considerations for mitigation.

One potential consideration here is to use encryption for data, to mitigate data leakage. However, in general the model can only operate on unencrypted data, so trust boundaries would need to be properly defined to ensure that unencrypted data is not leaking out of these. Alternatively, deploying fully-homomorphic encryption to run inference on data that is always encrypted is a possibility, but at the cost of slower inference.

| Threat | Description | Mitigation | Impact |
| :---- | :---- | :---- | :---- |
| **Data Leakage (output)** | Unintended exposure of sensitive information via model’s output  | \- output filtering mechanism \-Regularly audit and monitor model outputs for potential data leaks. | Exposure of confidential or PII data or intellectual property. |
| **Data poisoning** | When an external data source is used, it can lead to data poisoning. |  |  |
| **Feedback Data Privacy** | User feedback may contain PII or other sensitive information | \- Implement strict data anonymization techniques \- Use secure, encrypted storage for feedback data | Privacy violations and potential legal consequences |
| **Cross RAG Contamination** | Information leakage between different RAG instances or unauthorized data mixing. | \- data isolation \- Data lineage tracking | Data privacy violations and security boundary breaches |
| **Vector DB injection** | Manipulation of embedding vectors or metadata to affect retrieval results or inject malicious content | \- Input validation \- embedding sanitation | Compromised retrieval results and potential security vulnerabilities |
| **Vector Space Attacks** | Exploiting similarities in embedding space to manipulate RAG system behavior or extract sensitive information | \- Embedding space monitoring  | Unauthorized data access or manipulation of system behavior |
| **Embeddings confusion** | This can occur when representations of content can be confused, this can be caused by either the use of different models to generate embeddings, low precision or using 3rd party services to generate embeddings. | \- Use trusted embedding sources \- Use trusted embedding models \- Use trusted embeddings database providers  \- Enhance embeddings robustness and precision More for [Vector and Embeddings weaknesses LLM08:2025](https://www.securityium.com/a-guide-to-mitigating-llm082025-vector-and-embedding-weaknesses/#Mitigation_Strategies_for_LLM08_2025_Vector_and_Embedding_Weaknesses) |  |

#### 3.2.2 Model {#3.2.2-model}

The cornerstone of AI powered systems is a model or a set of models which will be integrated into the system. While models are not directly executed as programs or processes, they can still affect the systems’ confidentiality, integrity and availability in a few ways that we cover in this section.

Even if the models are stored in internal storage, they are not immune to supply chain security risks. Misconceptions may arise from assuming that internal models are inherently secure, overlooking the need for rigorous validation and continuous monitoring. These models are still susceptible to data poisoning attacks and tampering. These risks become more significant if external storage is being used. Since a model is not inspectable, someone with access to the storage could maliciously alter the model and hide their tracks. So it is important to ensure model integrity via digital signatures. Open source initiatives like Sigstore allow for the cryptographic signing of digital artifacts, like training sets or the model itself. A signed artifact allows for the consumer to check and test for authenticity by verifying its digital signature.

To quickly respond to security incidents, it is recommended to go one step further and get further visibility into the supply chain than just ensuring that the artifacts are tamper proof. That is, we should record all supply chain information (dependencies, build/training information, etc.) into standard supply chain documents, such as SLSA and SBOMs. These can be used both by humans and in automated systems. Humans can inspect provenance to make decisions on whether a component is suitable to be included in a larger application, whereas automation can perform version checks, integrity checks, licensing checks, etc. at scale. For example, using GUAC it would be possible to detect that a model's data had been tampered with and compromised before the model gets deployed into an application or used in a fine-tuning round to generate a derived model.

| Threat | Description | Mitigation | Impact |
| :---- | :---- | :---- | :---- |
| **Lack of Model Provenance or Incorrect Provenance** | The model’s provenance is invalid, or incomplete. It could also be tampered with, to hide attacks. Or, it could be missing | Generate model provenance using trusted builders. Model provenance is in a tamper proof format. Models without provenance cannot be used in applications | Invalid/corrupted models can get into production. Responding to security incidents is harder to do without a fully comprehensive provenance. |
| **Data Drift**	 | Changes in input data distribution over time that can degrade model performance or The external knowledge base becomes outdated, | \- Implement continuous monitoring \- Model retraining to adapt to new data patterns. | Decrease accuracy and relevance of the model, impacting its effectiveness and reliability. |
| **Model Inversion https://owasp.org/www-project-machine-learning-security-top-10/docs/ML03\_2023-Model\_Inversion\_Attack** | Model inversion is called out as part of the supply chain security risk as the data provided at model generation or model finetuning could be exposed here. | **\-** Use differential privacy (encryption) techniques during training \-Regularly audit and monitor model outputs for potential data leaks. \- Filtering (PII or Private Data) | Depending on the data supply chain, this could expose confidential or PII data. This might compromise model integrity and user trust. |
| **Model Serialization Attack** | Model weights could be serialized in unsafe formats (e.g., pickle). Loading these weights means executing code. | Use safe model serialization formats. Cryptographically sign models. | Running arbitrary code during model serialization is a possible attack vector. This can lead to compromises to the serving infrastructure. If the model is used as an intermediary, then the training infrastructure or the infrastructure to convert the model to another format could also be compromised. |

#### 3.2.3 Infrastructure {#3.2.3-infrastructure}

When integrating and consuming AI models, the underlying infrastructure plays a pivotal role in determining the overall security and reliability of the system. Infrastructure risks encompass a wide range of potential vulnerabilities and threats that can compromise the integrity, availability, and confidentiality of AI models and the data they process. These risks are particularly significant because they can affect not only the performance and efficiency of the AI systems but also the trustworthiness and compliance with regulatory standards.

Infrastructure risks can arise from various sources, including hardware failures, software vulnerabilities, network disruptions, and inadequate security measures. For instance, a hardware failure in a data center can lead to downtime, affecting the availability of AI services. Similarly, software vulnerabilities can be exploited by malicious actors to gain unauthorized access to sensitive data or manipulate AI model outputs. Network disruptions can hinder the seamless flow of data between different components of the AI system, leading to latency issues and degraded performance.

Moreover, the complexity of modern AI infrastructures, which often involve a mix of on-premises and cloud-based resources, adds another layer of risk. Managing these hybrid environments requires robust security protocols and continuous monitoring to detect and mitigate potential threats. Additionally, the increasing reliance on third-party services and APIs introduces new vectors for attacks, as the security practices of external providers may not align with the organization's standards. Understanding the underlying infrastructure is a critical piece for managing your risk.

| Threat | Description | Mitigation | Impact |
| :---- | :---- | :---- | :---- |
| **Cache Poisoning** | Malicious actors injecting harmful content into AI system caches,Prompt caching services built on top of 3rd party elements could be used to reduce latency and cost but could also lead to confidentiality, integrity/relevance, or availability to be compromised if cache poisoning attacks can be executed. | \- Cache validation mechanisms \- Exact cache matching | Compromised system responses and potential propagation of malicious content |
| **Feedback Loop Exploitation** | Manipulation of model feedback mechanisms to skew model learning and outputs. | \- Implement robust verification of feedback sources.  | Lead to gradual degradation of model performance or introduction of biases, |
| **Overly Permissive Entitlements** | An overly permissive role that is available to the model or application could allow an attacker to unintentionally access or modify resources that are allowed by it. | \- Identify roles and entitlements related to the AI system and implement least privilege. | Potential for lateral movement throughout the environment or malicious access |

#### 3.2.3.1: Self-Hosted On-Premises Infrastructure {#3.2.3.1:-self-hosted-on-premises-infrastructure}

Self-hosted on-premises infrastructure refers to the deployment of AI models and their supporting systems within an organization's own data centers. This approach grants the organization complete control over all components of the infrastructure, including hardware, software, networking, and security measures. The primary advantage of self-hosting is the ability to tailor the infrastructure to meet specific organizational needs and compliance requirements. For instance, industries with stringent data sovereignty regulations, such as healthcare and finance, may prefer self-hosted solutions to ensure that sensitive data remains within their jurisdiction. However, this approach also places the entire responsibility for supply chain security squarely on the organization's shoulders. Ensuring the integrity and security of both hardware and software components is paramount to protect against potential threats and vulnerabilities.

One of the primary challenges in self-hosted environments is the need for rigorous verification and validation processes. Organizations must implement robust mechanisms to verify the authenticity of hardware components and software packages. This includes using digital signatures, secure boot processes, and hardware root of trust (HRoT) to ensure that all components are genuine and have not been tampered with during transit. For instance, secure boot processes can prevent the loading of unauthorized or malicious software during system startup, thereby reducing the risk of malware injection.

Adherence to established security frameworks and standards is also crucial. Frameworks such as the National Institute of Standards and Technology (NIST) Cybersecurity Framework and ISO/IEC 27001 provide comprehensive guidelines for managing and mitigating supply chain risks. These frameworks emphasize continuous monitoring, risk assessment, and incident response planning. By following these standards, organizations can establish a structured approach to identifying and addressing vulnerabilities in their supply chains.

Self-hosted on-premises infrastructure offers unparalleled control and customization but demands significant resources and expertise to manage effectively. This strategy means that an organization is solely responsible for protecting against cyber threats. This includes implementing robust access controls, network controls, encryption, and intrusion detection systems. Any lapses in security can result in unauthorized access to AI models and data, potentially leading to breaches and compliance violations. Organizations must carefully weigh the benefits against the risks and ensure they have the necessary capabilities to maintain a secure and reliable environment.

#### 3.2.3.2: Self-Hosted on Cloud or Third-Party Managed Infrastructure {#3.2.3.2:-self-hosted-on-cloud-or-third-party-managed-infrastructure}

Self-hosted on cloud or third-party managed infrastructure represents a hybrid approach where organizations leverage cloud services while retaining control over certain aspects of their AI model deployment. In this setup, the cloud provider manages the underlying physical infrastructure, including servers, storage, and networking, while the organization is responsible for managing virtual machines (VMs), operating systems (OS), hosting middleware, API layers, and networking configurations.

One of the primary benefits of this approach is the flexibility it offers. Organizations can scale their resources up or down based on demand, paying only for what they use. This elasticity can significantly reduce costs compared to maintaining on-premises infrastructure. Additionally, cloud providers often offer advanced security features, such as automated threat detection and response, which can enhance the overall security posture of the AI system.

However, this shared responsibility model also introduces unique risks. The organization must ensure that the configurations and security settings of their VMs and OS are properly managed to prevent vulnerabilities. Misconfigurations can lead to unauthorized access, data breaches, or service disruptions. For example, improperly configured firewalls or insecure API endpoints can be exploited by attackers to gain access to sensitive data or disrupt AI model operations. Self-hosting on 3rd party infrastructure offers significant advantages in terms of scalability and cost-efficiency but requires careful management of shared responsibilities to mitigate associated risks. The organization must trust the cloud provider to maintain the security and integrity of the underlying infrastructure, which may not always be transparent while also continuously monitoring their configurations to ensure the secure and reliable operation of their AI models.

#### 3.2.3.3: Managed Services by Third-Party Providers {#3.2.3.3:-managed-services-by-third-party-providers}

Managed services offered by third-party providers involve the outsourcing of AI model hosting, tuning, and management to external vendors. In this setup, the third-party provider takes on the responsibility of maintaining the infrastructure, optimizing model performance, and ensuring high availability. The organization retains some control over networking, authentication, and authorization settings, as well as limited oversight over data flows and underlying components.

One of the main advantages of managed services is the expertise and resources that third-party providers bring to the table. These providers often have specialized knowledge in AI model management, which can lead to better performance and more efficient operations. Additionally, managed services can reduce the burden on internal IT teams, allowing organizations to focus on their core business activities.

However, this approach also introduces several risks. One significant concern is the potential loss of control over critical aspects of the AI system. While the organization retains some control, the third-party provider manages the majority of the infrastructure and model operations. This can lead to challenges in ensuring compliance with internal policies and regulatory requirements. For instance, organizations must ensure that the third-party provider adheres to stringent data protection standards and that data flows are securely managed. Any lapses in the provider's security measures could expose sensitive data to unauthorized access. If the provider's security practices do not align with the organization's standards, it could result in vulnerabilities or breaches.

Managed services by third-party providers offer significant benefits in terms of expertise and resource efficiency but require careful consideration of the associated risks. Organizations must thoroughly vet providers, establish clear service level agreements (SLAs), and maintain oversight to ensure the secure and compliant operation of their AI models.

#### 3.2.4 Application {#3.2.4-application}

When integrating AI applications developed by third parties, you must be vigilant about potential supply chain risks. These risks can manifest in various ways, from data privacy concerns to the integrity of the AI model itself. 

One of the primary concerns is the potential for data breaches. As AI applications often require access to sensitive data, users must ensure that the application's data handling practices are secure and compliant with relevant regulations. This includes understanding how data is stored, transmitted, and processed, as well as the measures in place to protect it. Another critical aspect is the integrity of the AI model. Developers should be aware of the model's provenance and the processes involved in its development. This includes understanding the data used to train the model, the algorithms employed, and any potential biases or limitations. It is essential to verify that the model has been thoroughly tested and validated to ensure its accuracy and reliability \- and that it does not harbour malicious code.

Additionally, use of third-party code, either in script or jupyter notebook format is common throughout the industry to develop or test new models/features. In such cases, users should exercise caution as they may assume positive intent, but ultimately do not know the author's intentions. This could potentially lead to the execution of malicious code or the exposure of sensitive information. It is crucial to verify the integrity of  external code and ensure that it aligns with the user's intended purpose.

Similarly, there is a large-scale dependence on third-party applications such as MLOps tooling and ML development frameworks to build, deploy and monitor models. Each component provides another potential point of attacker ingress, and users of these systems should look for security features, and security attestations. Many CVEs are published regarding vulnerabilities in the AI development stack, and should be closely monitored to ensure that you can upgrade affected versions of your chosen tooling.

With regard to generative AI usage, the risk of indirect prompt injection highlights that LLMs control flow can be hijacked, often without a user's awareness. This can be leveraged to potentially exfiltrate data, provide illicit results to an end user, or perform malicious actions on an attackers behalf. As LLMs are connected to more plugins, tools and services, their capabilities increase, however, so too do the risks. 

| Threat | Description | Mitigation | Impact |
| :---- | :---- | :---- | :---- |
| **Indirect Prompt Injection** | Instructions or malicious commands the model is exposed to due to external inputs used during inference, such as RAG/Agentic, web search, or tool output and other data sources. | \- Implement robust access controls and authentication mechanisms for data sources. \- Use content filtering on external data sources | Depending on the data supply chain, this could expose confidential or PII data or lead to unintended model behavior. |
| **Vulnerability in MLOps Tooling or ML Libraries** | Tooling used to support the development, deployment or monitoring of an AI model may itself contain a vulnerability that could be exploited by an attacker. | Update Libraries and MLOps tooling regularly. Record all tools and libraries in supply chain documents for each training run. | A vulnerability in, for example, text parsing could allow an attacker to exploit the system that handles augmentation to the model. |
| **Insecure function calling** | A model may have the capability to interact with plugins, tooling or services and perform actions on the users behalf. Hijacking the LLM via prompt injection may cause unwanted actions. | Restrict functions to read-only. Apply the principle of least privilege to the model's function access. Restrict access to the model via RBAC.  | An indirect prompt injection in a PDF may trigger undefined behaviour which deletes all files on a filesystem. |

## 4\. **Key Takeaways for Stakeholders in Your Organization** {#4.-key-takeaways-for-stakeholders-in-your-organization}

### 4.1 Executive Leadership  {#4.1-executive-leadership}

The rapid advancement and integration of artificial intelligence across various industries has brought to light critical supply chain risks that demand the attention of executive leadership. These risks are multifaceted and can significantly impact a company's operations, reputation, and long-term success. As AI systems become increasingly complex and autonomous, understanding and managing their supply chain becomes essential for several key reasons.

The dynamic nature of AI development and deployment poses unique challenges. AI technologies are evolving rapidly, with new algorithms, models, and architectures constantly emerging. This rapid innovation can lead to a supply chain that is difficult to manage and control. Executive leaders must consider how these new systems are built, tested, and integrated into existing infrastructure. Ensuring compatibility, security, and reliability across diverse AI components is crucial to prevent system failures and potential disruptions. 

The quality and ethical considerations of data are at the forefront of AI supply chain risks. AI models are only as good as the data they are trained on. Biased, incomplete, or malicious data can lead to inaccurate predictions, unfair outcomes, and legal issues. Leaders need to address data sourcing, storage, and usage practices to mitigate these risks. This includes implementing robust data governance policies, ensuring data privacy and security, and promoting ethical data collection and handling practices throughout the supply chain. 

Furthermore, the potential for supply chain disruptions and the associated financial and operational implications are significant. Executive leadership must be prepared to navigate these risks, ensuring business continuity and resilience. This involves identifying critical supply chain components, understanding dependencies, and developing contingency plans. By proactively addressing these risks, companies can maintain a competitive edge and foster trust in their AI-powered products and services.

As a leader looking at how to optimize the AI supply chain security of your organization, consider the following takeaways from this paper:

1. Understand the use of AI in your organisation including if it is present in vendor services provided to you  
2. Assemble a multi disciplinary team of senior stakeholders  
3. Create an ethics and risk committee focused specifically on AI for your organisation  
4. Ensure a basic level of AI understanding is present within your senior stakeholders



### 4.2 Security Practitioner {#4.2-security-practitioner}

In the realm of AI security, security practitioners are a critical piece in ensuring that these advanced technologies are secure and reliable. Their role is essential, as they are tasked with implementing safeguards at every stage of the AI lifecycle, from development to deployment and beyond. While they are not directly involved in creating the models, their expertise is essential in building a robust security framework around how models are developed and consumed.

Data is the lifeblood of AI, and security practitioners are responsible for its safety. They develop comprehensive strategies to secure data at rest and in transit, ensuring compliance with data protection regulations. This includes implementing encryption techniques, access controls, and secure data storage practices. By doing so, they mitigate the risks associated with data breaches and unauthorized access. 

Security best practices extend to the verification and validation of AI models. Security practitioners employ model attestation techniques, where the model's integrity and authenticity are verified. This process ensures that the model has not been tampered with, maintaining trust and reliability. By doing so, they build a foundation of trust for users and stakeholders. Post-deployment, security teams take on the role of vigilant observers. They monitor AI systems for potential vulnerabilities and threats. Regular security audits and penetration testing are conducted to identify and address risks proactively. By doing so, they ensure the system's resilience and adaptability.

Although many security practitioners may not be involved in the development of model artifacts, they play a critical role in ensuring security and reliability of these systems. Being aware of the rapidly evolving threat landscape and how to mitigate AI related risks will only become more important as these systems become more widely adopted.

As a security practitioner looking to help their organizations secure their AI applications, consider the following takeaways from the paper:

1. Understand the importance of securing the model development and serving phases. These stages are critical as they involve training, fine-tuning, and serving models  
2. Establish a risk profile for what your organization is comfortable accepting in your environment both open-source/open-weights and commercial models.  
3. Follow security best practices for managing your supply chain and consider unique nuances introduced by the AI supply chain to incorporate into your strategy.

### 4.3 AI Researcher/Engineer {#4.3-ai-researcher/engineer}

The R\&D team's primary focus is on innovation and pushing the boundaries of AI and machine learning. However, with great power comes great responsibility, especially when it comes to security. AI and machine learning researchers and engineers are often passionate about their work and highly skilled in their respective fields. However, they might not always have a comprehensive understanding of the security implications associated with their projects. This is where the outlined risks throughout all development phases can be invaluable for informing your research team.

Understanding AI supply chain risks is an essential tool for AI developers and researchers. By recognizing the potential vulnerabilities and challenges at each stage of development, they can make informed decisions to mitigate these risks. For instance, during the data collection phase, researchers can ensure they obtain diverse and representative datasets, avoiding biases that could impact model performance and fairness. This might involve implementing rigorous data validation processes and ethical guidelines for data handling.    
Cross functional collaboration with security practitioners is essential. By working closely with security experts, developers can gain a deeper understanding of the potential risks and best practices for mitigation. This collaboration can foster a culture of security awareness within the team, ensuring that security is not an afterthought but an integral part of the development process.  

As a model developer or AI Researcher/Engineer consuming an external model in your software supply chain, consider the following key takeaways:

1. Recognize that AI systems are part of a complex supply chain, encompassing data, infrastructure, applications, and models. Each component can introduce risks and vulnerabilities, so a holistic understanding is essential to securing them.  
2. Consider standardized model cards or documentation for the models produced in your environment.  
3. Partner closely with your security counterparts to establish what risks could be introduced by your AI applications as early as possible during the development process.

## 5\. Conclusion {#5.-conclusion}

AI brings new unique properties that need to be carefully accounted for when assessing risk in your applications. Over time, even more novel methods for attacking AI systems will likely be discovered which will also then need to be taken into consideration. At the same time, you still need to make sure you do not neglect ‘traditional’ threats, for example leaking infrastructure credentials where the model is run, or vulnerabilities in the tools and libraries which support the development of AI. Therefore, it is important to consider the supply chain of an AI system, namely the four constituent components, Data, Infrastructure, Application, and Model, and that you incorporate AI-specific threats and ‘traditional’ threats into the threat model that encompasses them. This document is a living document and will evolve over time as will the recommendations for the latest edition please see our github repo here. 

Future publications will delve into areas such as cryptographic standards/recommendations for model signing/consumption, SLSA style levels and recommendations for model development pipelines and standardized models cards and recommendations on how consumers should interpret them. 

We will continue to publish to our Github repo, we welcome you to follow along at [https://github.com/cosai-oasis/ws1-supply-chain](https://github.com/cosai-oasis/ws1-supply-chain).

**NOTE**: _Integrating the risk identification and control strategies discussed in this paper with the defender framework analysis and other guidance in the other CoSAI's workstreams can enable a more cohesive and adaptive security strategy for the AI supply chain._

If you or your organisation would like to contribute to efforts in the space please reach out to us at [https://www.coalitionforsecureai.org/join-us/](https://www.coalitionforsecureai.org/join-us/)

## 6\. Acknowledgements {#6.-acknowledgements}

### Workstream Leads Chairs: 

#### Matt Maloney, ([mattmaloney@cohere.com](mailto:mattmaloney@cohere.com)), Cohere

#### Andre Elizondo, ([andre.elizondo@wiz.io](mailto:andre.elizondo@wiz.io)), Wiz

#### Jay White, ([jaywhite@microsoft.com](mailto:jaywhite@microsoft.com)), Microsoft

### Editors: 

#### Mihai Maruseac, ([mihaimaruseac@google.com](mailto:mihaimaruseac@google.com)), Google

#### Eoin Wickens, ([eoin@hiddenlayer.com](mailto:eoin@hiddenlayer.com)), HiddenLayer

#### John Stone, ([thestone@google.com](mailto:thestone@google.com)), Google

### Contributors:

#### Adam Tuaima, ([adam_tuaima@trendmicro.com](mailto:adam_tuaima@trendmicro.com)), TrendMicro

#### Arber Salihi, ([Arber.Salihi@thomsonreuters.com](mailto:Arber.Salihi@thomsonreuters.com)), Thomson Reuters

#### Danilo Tommasina, ([danilo.tommasina@thomsonreuters.com](mailto:danilo.tommasina@thomsonreuters.com)), Thomson Reuters

#### Daniel Rohrer, ([drohrer@nvidia.com](mailto:drohrer@nvidia.com)), NVIDIA

#### Judith Furlong, ([Judith.Furlong@dell.com](mailto:Judith.Furlong@dell.com)), Dell

#### Lorezno Verstraten, ([lorenzo.verstraeten@thomsonreuters.com](mailto:lorenzo.verstraeten@thomsonreuters.com)), Thomson Reuters

#### Michael Katz, ([mickatz@paypal.com](mailto:mickatz@paypal.com)), PayPal

#### Ian Molloy, ([molloyim@us.ibm.com](mailto:molloyim@us.ibm.com)), IBM

#### Yassine Ilmi, ([yassine.ilmi@thomsonreuters.com](mailto:yassine.ilmi@thomsonreuters.com)), Thomson Reuters

#### Victor Lu, ([Victorjunlu@gmail.com](mailto:Victorjunlu@gmail.com)),

## 7\. Appendix {#7.-appendix}

### 7.1 CoSAI Focus
CoSAI is an OASIS Open Project, bringing together an open ecosystem of AI and security experts from industry-leading organizations. The project is dedicated to sharing best practices for secure AI deployment and collaborating on AI security research and product development. The scope of CoSAI is specifically focused on the secure building, integration, deployment, and operation of AI systems, with an emphasis on mitigating security risks unique to AI technologies. Other aspects of Trustworthy AI are deemed important but beyond the scope of the project including, ethics, fairness, explainability, bias detection, safety, consumer privacy, misinformation, hallucinations, deep fakes, or content safety concerns like hateful or abusive content, malware, or phishing generation. By concentrating on developing robust measures, best practices, and guidelines to safeguard AI systems against unauthorized access, tampering, or misuse, CoSAI aims to contribute to the responsible development and deployment of resilient, secure AI technologies.

### 7.2 Guidelines on usage of more advanced AI systems (e.g. large language models (LLMs), multi-modal language models. etc) for drafting documents for OASIS CoSAI:

_tl;dr: CoSAI contributions are actions performed by humans, who are responsible for the content of those contributions, based on their signed OASIS iCLA (and eCLA, if applicable). [Each contributor must confirm whether they are entitled to donate that material under the applicable open source license;  OASIS and the CoSAI Project do not separately confirm that.]  Each contributor is responsible for ensuring that all contributions comply with these AI use guidelines, including disclosure of any use of AI in contributions._

* **Selection of AI systems:** CoSAI recommends the use of reputable AI systems (lowering the risk of inadvertently incorporating infringing material).
* **Model constraints:** Currently, CoSAI or OASIS are not required to have a contract or financial agreement for using AI systems from specific vendors. However, CoSAI editors should consider employing varying tools to avoid potential fairness concerns among vendors.
* **IP infringement:** It is the responsibility of the individual who subscribes/prompts and receives a response from an AI system to confirm they have the right to repost and donate the content to OASIS under our rules.
* **Transparency:** CoSAI’s goal will be to maintain transparency throughout the process by documenting substantial use of AI systems whenever possible (e.g., the prompts and the AI system used), and to ensure that all content, regardless of production by human or AI systems, was reviewed and edited by human experts. This helps build trust in the standards development process and ensures accountability.
* **Human-edited content and quality control:** CoSAI mandates human-reviewed or -edited results for any final outputs.  A robust quality control process should be in place, involving careful review of the generated content for accuracy, relevance, and alignment with CoSAI's goals and principles. Human experts should scrutinize the output of AI systems to identify any errors, inconsistencies, or potential biases.
* **Iterative refinement:** The use of AI systems in drafting standards should be seen as an iterative process, with the generated content serving as a starting point for further refinement and improvement by human experts. Multiple rounds of review and editing may be necessary to ensure the final standards meet the required quality and reliability thresholds.


### 7.3 Copyright Notice
Copyright © OASIS Open 2025\. All Rights Reserved. This document has been produced under the process and license terms stated in the OASIS Open Project rules: https://www.oasis-open.org/policies-guidelines/open-projects-process.  
This document and translations of it may be copied and furnished to others, and derivative works that comment on or otherwise explain it or assist in its implementation may be prepared, copied, published, and distributed, in whole or in part, without restriction of any kind, provided that the above copyright notice and this section are included on all such copies and derivative works. The limited permissions granted above are perpetual and will not be revoked by OASIS or its successors or assigns. This document and the information contained herein is provided on an "AS IS" basis and OASIS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTY THAT THE USE OF THE INFORMATION HEREIN WILL NOT INFRINGE ANY OWNERSHIP RIGHTS OR ANY IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. OASIS AND ITS MEMBERS WILL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, SPECIAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF ANY USE OF THIS DOCUMENT OR ANY PART THEREOF. The name "OASIS" is a trademark of OASIS, the owner and developer of this document, and should be used only to refer to the organization and its official outputs. OASIS welcomes reference to, and implementation and use of, documents, while reserving the right to enforce its marks against misleading uses. Please see [https://www.oasis-open.org/policies-guidelines/trademark/](https://www.oasis-open.org/policies-guidelines/trademark/) for above guidance.

This is a Non-Standards Track Work Product. The patent provisions of the OASIS IPR Policy do not apply.

4 March 2025 Non-Standards Track Copyright © OASIS Open 2025\. All Rights Reserved. This document was last revised or approved by the CoSAI Open Project on the above date.   
