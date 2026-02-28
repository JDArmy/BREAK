# JDArmy BREAK - Business Risk Enumeration & Avoidance Knowledge Framework

English | [中文](./README_CN.md)

## Online: <https://break.jd.army/>

## Introduction

JDArmy BREAK stands for **Business Risk Enumeration & Avoidance Knowledge** — an open framework for enumerating and mitigating business risks. By systematically classifying, describing, and cataloguing a wide range of business risks, it provides a comprehensive risk landscape and offers practical avoidance guidance to help organizations build security capabilities and reduce business risk.

> BREAK is created, owned, and managed by JD.Army — a professional red team focused on identifying and resolving enterprise security operational risks. JD.Army reserves the right to update BREAK and this documentation periodically at its sole discretion. While JD.Army owns all rights and interests in BREAK, it licenses the public to use it freely under the relevant open source license.

## Background

As information security capabilities increasingly cover business operations and business demands for security deepen, limiting security to the traditional network security domain — merely discovering and patching vulnerabilities — is clearly insufficient to ensure normal business security operations or meet higher business security requirements.

Drawing on years of experience and accumulated understanding of business security, JDArmy introduces BREAK — the *Business Risk Enumeration & Avoidance Knowledge Framework* — to provide guidance and a reference basis for enterprise blue teams conducting business security assessments. The business risk avoidance knowledge in the framework also serves as a guide for building security capabilities, running business security operations, and improving risk control.

## Methodology

The framework is organized around three levels: **risk dimensions**, **risk scenarios**, and **risk items**. The framework contains multiple risk dimensions; each dimension contains multiple risk scenarios; and each scenario contains multiple risk items.

The current framework catalogues 135+ risk items, 73 avoidance measures, 61 attack tools, 33 threat actors, and 15 business scenes, with ongoing additions, upgrades, and adjustments based on developments and feedback. Each risk item consists of: a risk ID, risk title, risk definition, risk description, risk complexity, risk influence, avoidance measures, references, and associated attack tools. Risk IDs follow the format `R00xx` for unique identification (modeled after MITRE ATT&CK) to facilitate communication and intelligence sharing. Attack descriptions guide blue teams in security capability assessments, while avoidance measures help red teams and business risk control to strengthen security capabilities and reduce business risk.

**Important note:** Business risks and vulnerabilities are not the same thing. Vulnerabilities are generally caused by coding defects and can be fixed by modifying code to remove the defect. Business risks, however, are largely not caused by coding defects — they are unintended exploitations of normal business logic by attackers. As a result, it is usually impossible to completely eliminate business risks; they can only be reduced to an acceptable level. Instead of direct code fixes, business risks typically require added security capabilities and risk control models to slow attacks, reduce attack ROI, and shrink the attack surface.

## Collaboration & Contribution

The framework is described in JSON format under the `/src/BREAK` directory:

- `basic-info` — basic information about the framework
- `risks` — risk item catalogue
- `avoidances` — avoidance measures catalogue
- `avoidance-categories` — avoidance measure categories
- `business-scenes` — business scenes
  - `riskDimensions` field: risk dimensions covered by the scene
  - `riskScenes` field: risk scenarios and associated risk items for the scene
- `attack-tools` — attack tool catalogue
- `threat-actors` — threat actor catalogue
- `ability-providers` — ability providers and the business risk avoidance capabilities they offer
- `utils.ts` — common data loading utility functions

Contributors are welcome to collaborate by directly editing the JSON files. You can also open an issue on GitHub to share suggestions or feedback.

### Acknowledgements

- Thanks to 团长 and we1h0 for their valuable suggestions

## Links

- GitHub: <https://github.com/JDArmy/BREAK>

## Development

### GUI Configuration

```shell
node ./src/server/main.cjs
```
