package io.github.mucsi96.learnlanguage.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "extraction_regions", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractionRegion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "source_id", nullable = false)
    private Source source;

    @Column(name = "page_number", nullable = false)
    private Integer pageNumber;

    @Column(nullable = false)
    private Double x;

    @Column(nullable = false)
    private Double y;

    @Column(nullable = false)
    private Double width;

    @Column(nullable = false)
    private Double height;
}
