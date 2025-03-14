export const filenameTemplateInstructions = `
Enter template for creating synced article file name.

<div class="cubox-variables-container">
    <div class="cubox-variables-title">Available variables</div>
    <ul class="cubox-variables-list">
        <li>{{title}}</li>
        <li>{{article_title}}</li>
        <li>{{create_time}}</li>
        <li>{{update_time}}</li>
        <li>{{domain}}</li>
        <li>{{type}}</li>
    </ul>
    <div class="cubox-reference">For more, refer to <a href="#" class="reference-link">reference</a>.</div>
</div>
`;

export const metadataVariablesInstructions = `
Enter the metadata separated by comma. you can also use custom aliases in the format of metadata::alias. For syncing purposes, the id will always be included.

<div class="cubox-variables-container">
    <div class="cubox-variables-title">Available variables</div>
    <ul class="cubox-variables-list">
        <li>title</li>
        <li>article_title</li>
        <li>tags</li>
        <li>create_time</li>
        <li>update_time</li>
        <li>domain</li>
        <li>url</li>
        <li>cubox_url</li>
        <li>description</li>
        <li>words_count</li>
        <li>type</li>
    </ul>
    <div class="cubox-reference">For more, refer to <a href="#" class="reference-link">reference</a>.</div>
</div>
`;

export const contentTemplateInstructions = `
Enter template for creating synced article content.

<div class="cubox-variables-container">
    <div class="cubox-variables-title">Available variables</div>
    <ul class="cubox-variables-list">
        <li>{{id}}</li>
        <li>{{title}}</li>
        <li>{{description}}</li>
        <li>{{article_title}}</li>
        <li>{{content}}</li>
        <li>{{content_highlighted}}</li>
        <li>{{highlights}}</li>
        <li class="highlight-item">
            {{highlight_text}}
            <ul class="highlight-sublist">
                <li>{{text}}</li>
                <li>{{image_url}}</li>
                <li>{{cubox_url}}</li>
                <li>{{note}}</li>
                <li>{{color}}</li>
                <li>{{create_time}}</li>
            </ul>
        </li>
        <li>{{tags}}</li>
        <li>{{create_time}}</li>
        <li>{{update_time}}</li>
        <li>{{domain}}</li>
        <li>{{url}}</li>
        <li>{{cubox_url}}</li>
        <li>{{words_count}}</li>
    </ul>
    <div class="cubox-reference">For more, refer to <a href="#" class="reference-link">reference</a>.</div>
</div>
`; 

export const cuboxDateFormat = `
If date is used on above templates, enter the format date.

<div class="cubox-variables-container">
    <div class="cubox-variables-title">Example</div>
    <ul class="cubox-variables-list">
        <li>yyyy-MM-dd</li>
        <li>MM/dd/yyyy</li>
        <li>dd.MM.yyyy</li>
        <li>yyyy-MM-dd HH:mm:ss</li>
    </ul>
    <div class="cubox-reference">For more, refer to <a href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens" class="reference-link">reference</a>.</div>
</div>
`; 