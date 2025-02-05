# Establish Risks and Controls for the AI Supply Chain

## Abstract:
Summary of the technical purpose of the document.

## 1. Introduction

Threat modeling is a critical process for ensuring the security and resilience of AI systems, particularly as these systems become increasingly integrated into complex software ecosystems. While threat modeling is a common practice in developing software, AI systems present distinct challenges and considerations. Many existing approaches fall short of addressing the unique aspects of AI model development. This paper aims to address these gaps by proposing a focused AI threat model, emphasizing model development and serving phases.

### 1.1 Existing Work & Frameworks

## 2. Defining the AI Supply Chain

The AI supply chain is a multifaceted ecosystem encompassing four critical dimensions: Data, Infrastructure, Application, and Model. Each of these components plays a vital role in the development, deployment, and security of AI systems. Data serves as the foundation, influencing model performance and trustworthiness, while infrastructure encompasses the computing resources, storage, and networking that support AI workloads. The application layer integrates AI models into end-user products, ensuring functionality and interaction with external systems. Finally, the model itself—comprising its architecture, training data, and fine-tuning processes—represents the core intelligence behind AI-driven solutions. A comprehensive understanding of these four dimensions is essential to securing the AI lifecycle, as vulnerabilities in any stage can propagate throughout the entire system.

The following sections focus on two key stages: Model Generation and Model Integration & Consumption. Model Generation explores how AI models are trained, fine-tuned, and stored, while Model Integration & Consumption examines how these models interact with applications and users. Both stages present unique security challenges that must be addressed to ensure a resilient AI supply chain.


### 2.1 Model Generation
From the supply chain point of view this translates into having a supply chain for the traditional software components (serving stack, application code, and – if implemented without AI – plugins and filters). We also need to record the supply chain for any ML model used in this process – this is what we are going to focus on for the rest of this paper.

Large models are generated via a process that has at least 3 different stages: initial training where a foundation model gets trained on large text corpora, several (at least one) step of finetuning the model for specific tasks, and, finally, deploying the model into the application.

**todo: insert image**

In general, the teams working on these stages are different and the model is stored in separate storage between the stages. The storage infrastructure is also part of the supply chain for an AI-powered application.

Developing one single model, for one of the stages presented above is done via a large, iterative process:

**todo: insert image**

The training starts from collecting the datasets used in training. These datasets need to be filtered and processed to match the input shapes, eliminate duplicated data, fix incorrect information, fill in missing values, etc. This is an iterative process, taking multiple iterations, and performed via another application. The supply chain for this application needs to be considered to have a holistic view of the supply chain for the ML-powered application that the user sees. Furthermore, the data storage infrastructure is also a relevant part of the ML supply chain.

In general, when the foundation model training begins, the datasets used for training are configured via mixture weights (e.g., a model could be trained with 80% of data from Wikipedia data, 15% from trusted news sources, 5% from Reddit posts). Since data influences the model’s performance, we need to cover the mixture weights into the model’s supply chain.

In order to train a model, besides data, we also need to define the model architecture (the layers that compose the model, number of transformers, etc.). This is done using an API specified by the ML framework chosen to do the training on. We need to record the model source code as part of the ML supply chain, and we also need to consider the supply chain for the ML framework itself.

Finally, during training a foundational model, the training process might start from a previous checkpoint or might involve separate pretrained models. The provenance for these should also be included in the supply chain for the ML powered application.

All the input models/checkpoints as well as the models/checkpoints generated from training need to be stored in storage between iterations and before the model gets published/elevated to the next stage of developing an ML-powered application.

Post-training model evaluation should also be considered as part of the ML supply chain. An improperly evaluated model will result in vulnerabilities/misbehavior if it gets deployed into the application. Since evaluation is done by analyzing the model’s performance on some data, all the data-relevant supply-chain components need to be considered, as well as the supply chain parts needed for the evaluation infrastructure and the code used to define the evaluation process.

### 2.2 Model Integration & Consumption

From the point of view of an user of an AI powered application, we care about the combination of the AI model and the application built around it. In general, the application sends requests to the model (based on the user's prompt) and sends the model output back to the user. There might be filtering done for both inputs and outputs of the model (e.g., safety, privacy):

![architecture](../../assets/img/architecture.png)

The AI-powered application/model could use other AI agents, plugins or tools. The filters can also be other models or could be traditional (non-AI) software. All models need to run on an ML serving stack, which can be either embedded into the application or hosted remotely (in which case communication is done via Remote Procedure Calls (RPCs) calls).

## 3. Risks, Threats, and Existing Mitigations

### 3.1 Model Generation

#### 3.1.1 Data

Data poisoning is a sophisticated attack vector that poses a significant risk to the security and reliability of AI models. It involves the intentional manipulation of training or fine-tuning data to compromise/modify a model's intended behavior and output. Small targeted changes to a training dataset can have large downstream consequences. These types of attacks can be particularly insidious as they may go unnoticed until the model is deployed and starts making erroneous predictions.

In the context of model generation, data poisoning can occur at various stages, from data collection and preprocessing to later stages that include human supervised finetuning. Attackers might target the data sources directly, injecting malicious samples or altering existing data. For instance, in image classification tasks, poisoned data could include subtly modified images with incorrect labels, leading the model to learn incorrect associations. Training data sets that contain URLs pointing to external data not controlled by an individual/entity are susceptible to that being modified (maliciously or not). Similarly, in natural language processing, poisoned text data might contain carefully crafted sentences designed to bias the model's understanding. Poisoned data may even introduce backdoors into a model that may be triggered by a specific pattern or sequence passed as input. Modern models are powered by enormous amounts of data, understanding your data and its origins is a critical piece of model development.

Data could also be poisoned indirectly by posting malicious/wrong information on the internet. When an AI crawler sources the data, this would result in incorrect content being later fed up to training pipelines. Some people might intentionally poison the data on the internet to prevent training on their own copyrighted material.

Another place where data could be poisoned is post ingestion, before training: when performing data cleaning (reducing duplicates, correcting mistakes, filling in missing data/metadata, trying to correct for bias, adding missing labels). Human reviewers might accidentally or intentionally mislabel data. Tooling that performs data curation at scale might be affected by bugs.

Even when training starts, not all data is treated the same. Data from more trusted sources has a larger weight compared to data sourced from crawling the internet. These weights can also influence the result of the training process.

One of the most effective strategies to combat data poisoning and ensure model security is by implementing data provenance practices. Data provenance refers to the comprehensive documentation and tracking of data throughout its lifecycle, from its origin to every transformation and processing step. Maintaining a detailed record of all data sources is crucial. This includes information about the origin, collection methods, and any initial preprocessing steps. For example, in a computer vision project, track the sources of images, whether they are from public datasets, web scraping, or internal collections. As data undergoes various transformations during preprocessing, cleaning, and augmentation, log and track every step. Record the specific operations, parameters, and tools used. For instance, note the resizing, cropping, or data augmentation techniques applied to images, or the text normalization and tokenization processes in NLP tasks. Implement version control for data, similar to code versioning. By tracking data sources and transformations, it becomes easier to identify issues in your pipelines. Regularly updating and monitoring data sources can also help detect and prevent such attacks.

Finally, data could be altered directly while in storage, before or during training if people can abuse access to storage to directly overwrite what is being stored. Data integrity protections become paramount.

#### 3.1.2 Model

Training a model has 3 different components that need to be considered: the data that goes into training, the model source code (its architecture, hyperparameters, etc.), and the framework and libraries used to train the model, together with their dependencies. In some cases, there is an additional component: some training steps involve starting from a pre-trained model and adapting that (e.g., finetuning, quantization). Data has been covered in the previous section.

The use of open-source libraries and third-party dependencies is prevalent in AI model development. Open source offers developers numerous benefits in terms of functionality and efficiency. However, it also introduces a unique set of security risks that developers and organizations must be aware of.

One of the primary concerns is the possibility to use vulnerable or outdated dependencies. Open-source libraries, while powerful, may contain known and unknown security flaws that go unnoticed. Outdated dependencies might lack security patches, making them susceptible to known attacks also. Knowing this, attackers often target widely used libraries and libraries that contain known vulnerabilities. Consider a scenario where a critical vulnerability is identified in a popular machine learning framework (which happens frequently [insert links]). Models built using the vulnerable version of the framework become potential targets. Attackers can leverage the known vulnerability to compromise the model's integrity or the underlying infrastructure the model is being served on. The risk is further exacerbated by the fact that updating or patching dependencies might not always be a straightforward process. Developers often face challenges in keeping up with the latest versions due to compatibility issues, breaking changes, or the time and effort required to update and retest their models.

Furthermore, supply chain attacks on a dependency of a popular ML framework are another risk. An ML practitioner cannot efficiently know the version of all packages that are needed as transitive dependencies for the ML framework used to train the model. Instead, we recommend relying on supply chain metadata such as SLSA and SBOM and aggregating this at scale using GUAC or similar tools. This ensures that the ML practitioner can focus on writing the code to describe the model and on the training pipeline themselves, while automation takes care to vet all the dependencies to ensure they are at recent versions, lack vulnerabilities, and are not affected by supply chain incidents.

It is also important to protect the code that describes the model. The number of layers, the activation functions, the number of transformers, attention heads, etc. used in a model could significantly alter its performance. What’s worse, is that it is possible to change the model architecture such that when it receives a specific input it performs a totally different set of operations. This can only be detected by analyzing the source code of the model, so making sure that training pipelines only start from code that has been properly reviewed is paramount. Pipelines that allow developers to ad-hoc import local changes before training a production-grade model are at risk of insider compromise. Similar care must be taken to ensure that the source control used to store the model code cannot be compromised.

Finally, when using pre-trained models, it is possible that the input model has been tampered with. The training pipeline should verify the integrity of all of its inputs, be them software artifacts, datasets or models.

—-Insert mitigations—

#### 3.1.3 Infrastructure

In the realm of AI systems, the infrastructure supporting models and their creation is a critical component that can introduce significant risks and vulnerabilities. Infrastructure encompasses the physical and virtual resources required to develop, train, and deploy AI models, including data centers, cloud services, and network configurations. The complexity and scale of these systems make them susceptible to a variety of threats that can compromise the integrity, availability, and confidentiality of AI models they’re used to build and serve.

TODO: move data, code and model storage here? Move training pipelines here? Discuss checkpoints during training, tampering the checkpoint and then crashing the training process so that it starts from an altered version.

#### 3.1.4 Application

TODO: Model provenance before it is ingested into the application. Discuss applications that talk to a model via RPC/REST/etc. vs applications that have the model embedded on the same platform. Second case needs to protect against model exfiltration too. Make sure to not duplicate with model integration section below.

### 3.2 Model Integration & Consumption

#### 3.2.1 Data

[ For each “category”/piece (inputs/outputs, RAG, feedback):
problem / approach (solution) / what to consider (high level, with ref if needed) ]
TODO: Define the different types of attack surfaces related to data:
1) User input and model answer, filtering needed to avoid malicious prompt injections attacks and filtering for offensive, biased, hallucinated and generally inappropriate answers
Could be simple filtering or pull another system here
If another system, traditional supply chain risks apply.
Filtering should take into account regulatory requirements (the law) as well as org-specific requirements (IP
2) For systems with a RAG component, they are subject to attacks similar to data poisoning, where the retrieval system (e.g. embeddings database) is tampered or poisoned in a way that it drifts into returning incorrect context for valid prompts.
For Vector databases embeddings confusion, the pipeline itself, etc…
For other datasources more traditional data poisoning
3) Feedback poisoning, leverages weaknesses in the model monitoring or feedback capture system that injects poisoned data into the pipelines used for retraining models over time. The data is fed back into the training system and it can lead to a gradual drift of the models slowly moving over time from a “clean” state into producing biased and malicious responses.


#### 3.2.2 Model

TODO: Differentiate between various model “provenance” schemes:
1) Model coming from an internal repository (self trained, or hosting a verified copy of a trusted model)
2) Downloaded from public repository
https://huggingface.co/docs/hub/security-pickle
https://github.com/protectai/modelscan/tree/main?tab=readme-ov-file#what-models-and-frameworks-are-supported
3) 3rd party managed service, accessed via endpoint, no access to model binaries
Confidentiality compormised (Data ownership loss, or Cohere e.g. DeepSeek)

#### 3.2.3 Infrastructure

TODO: Differentiate between various infrastructure setups:
Self-hosted on-prem (end-to-end responsibility of all components)
Self-hosted on cloud/3rd party managed infra (shared responsibility, provider manages low-level infra, model owner manages VMs, OS, hosting middleware, API layers, networking, …)
(Cloud) Managed service, 3rd party provider offers managed services to host, tune and have some level of control on models hosted within the managed service, model owner manages some levels of networking, authentication & authorization settings, has some limited level of control over data flows and underlying components.
Fully managed 3rd party endpoint. The consumer essentially hits an API endpoint provided by a 3rd party with very little control over anything.

#### 3.2.4 Application
TODO:

### 4. Securing the AI Supply Chain in Real-World Scenarios

#### 4.1 Exec Persona - CIO, CTP, VPoAI

The software supply chain security threat has caught attention from C-level executives, leading to extensive collaboration across the industry to tackle this challenge.
https://www.darkreading.com/application-security/software-supply-chain-concerns-reach-c-suite

https://reports.weforum.org/docs/WEF_Global_Cybersecurity_Outlook_2025.pdf?utm_source=chatgpt.com
“Of large organizations, 54% identified supply chain challenges as the biggest barrier to achieving cyber resilience.”

According article by Michael Boeynaems, "[contextual] A CEO worries about threats such as ransomware or supply chain attacks"
https://www.toreon.com/threat-modeling-insider-november-2024/

Improving software supply chain security is challenging. Organizations often rely on numerous third-party components, open-source libraries, and external services. It is difficult to maintain comprehensive visibility and control over all elements. The lack of standardized security practices across the industry also contributes to inconsistent protection levels, In addition,  the rapid pace of software development can hinder timely vulnerability assessments.

While security personnel and R&D play the front and center role implementing security measures, they cannot address supply chain security effectively in isolation. CEO, CIO, CTO, VP executives bring strategic vision, resource access, influence, expertise, and compliance knowledge, making their perspective and participation crucial for fostering a culture of security.

The complexities of securing the AI/ML supply chain is even a bigger problem for CEO,CIO, CTO, VPoAI.  Large number of often opaque external datasets, pre-trained models, and dynamic learning processes that introduce new and evolving risks. Threats such as data poisoning, adversarial attacks, and model theft make it difficult to ensure the integrity of AI-driven decisions.

Different Focus areas: 
C-Level (CIO, CTO, VPoAI, etc.) → Define AI supply chain security strategy & governance, enforce SSDF/SLSA adoption, and ensure vendor and third-party compliance.
Security Personas → Implement supply chain security controls, secure AI model provenance & software dependencies, and mitigate risks from third-party components.
R&D Teams → Develop AI models using trusted datasets, verified software components, and secure development practices, ensuring supply chain integrity throughout the AI lifecycle.

Examples: 
C-Level (CIO, CTO, VPoAI, etc.) → A VPOAI (or CISO) mandates that all third-party AI models and datasets must have provenance tracking and comply with SLSA Level 3 before integration into enterprise AI systems.

Security Personas → A security engineer implements cryptographic signing for AI model artifacts in the CI/CD pipeline to ensure models haven’t been tampered with before deployment.

R&D Teams → An AI researcher verifies that all pre-trained models used for training comply with SSDF secure coding practices and originate from trusted sources to prevent supply chain attacks.


#### 4.2 Security Practionioners

#### 4.3 Research & Development

### 5. Conclusion