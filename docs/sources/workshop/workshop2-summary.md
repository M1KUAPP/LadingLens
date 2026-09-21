This workshop recording provides clarifications for participants of the Averis x Monash Hackathon 2026 regarding project requirements, evaluation criteria, and technical operations.

### **Key Technical and Operational Guidance**

- **Process Efficiency:** Manual checking processes, such as document comparisons, can take up to 10 minutes per instance.
- **System Discrepancies:** Participants should focus on identifying discrepancies and designing human review workflows. Partial mismatches often arise from document formatting, such as the use of asterisks to indicate text continuation.
- **Architecture and Design:** There is no strict constraint on the technology stack, but teams must justify their technical decisions, such as why an agent or a specific model was chosen. Judges prioritize system design and architecture, and teams should ensure their solution meaningfully addresses the problem.
- **Output Format:** While JSON files are useful for verification, teams should consider generating a CSV file that highlights discrepancies (e.g., comparing Shipping Instructions against Bills of Lading) with explanations for each mismatch.

### **Judging and Submission Information**

- **Evaluation Focus:** The primary focus is on the accuracy of the discrepancy detection and the quality of the human review workflow.
- **Demo Videos:** Presentations should clearly explain the storytelling behind the features. It is recommended to start the demo with a simulated inbox feed, showing the process from email receipt through the comparison step to the final result.
- **Supporting Evidence:** Assumptions and test results can be presented in the demo, appendix of the slides, or the GitHub README, but teams must ensure consistency across these platforms.
- **Synthetic Data:** Participants may use synthetic data to train their models, but the final evaluation will rely on ground-truth data sets.

### **Shipping Documentation Clarification**

- **Consignee vs. "To Order of":** These are distinct terms. A consignee is the party designated to accept goods or the party to whom the carrier delivers cargo. "To order of" indicates that the Bill of Lading is negotiable, meaning the right to claim the goods can be transferred via endorsement.

Participants are encouraged to refer to the resources channel on the Discord server for the official judging rubric and necessary data sets.
