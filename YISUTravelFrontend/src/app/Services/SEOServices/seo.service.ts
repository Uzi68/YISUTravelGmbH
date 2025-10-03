import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SEOService {
  constructor(private title: Title, private meta: Meta) { }

  updateTitle(title: string) {
    this.title.setTitle(title);
  }

  updateDescription(description: string) {
    this.meta.updateTag({ name: 'description', content: description });
  }

  updateKeywords(keywords: string) {
    this.meta.updateTag({ name: 'keywords', content: keywords });
  }

  updateOgUrl(url: string) {
    this.meta.updateTag({ property: 'og:url', content: url });
  }

  updateAuthor(author: string) {
    this.meta.updateTag({ name: 'author', content: author });
  }

  updateCanonical(url: string) {
    this.meta.updateTag({ rel: 'canonical', href: url });
  }
}
